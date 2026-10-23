import {companyKey} from './utils/importIdentity.js';
import InvoiceUploadModal from './components/import/InvoiceUploadModal.jsx';
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Sidebar from "./components/layout/Sidebar.jsx";
import Header from "./components/layout/Header.jsx";
import Toast from "./components/common/Toast.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Shipments from "./pages/Shipments.jsx";
import Documents from "./pages/Documents.jsx";

import ShipmentForm from "./components/shipments/ShipmentForm.jsx";
import PortalModal from "./components/portals/PortalModal.jsx";
import ExcelUploadModal from "./components/import/ExcelUploadModal.jsx";
import CompanySelector from "./components/companies/CompanySelector.jsx";
import CompanyModal from "./components/companies/CompanyModal.jsx";
import UserManagement from './components/auth/UserManagement.jsx';
import ActivityHistory from './components/auth/ActivityHistory.jsx';

import { companyRecords } from "./utils/companies.js";

import useInventory from "./hooks/useInventory.js";

import {
  saveRecord,
  shipmentStatus,
} from "./utils/shipments.js";

import { createPortal } from "./services/portalService.jsx";
import { importShipmentRecords, previewShipmentImport, updateShipmentRecord } from './services/shipmentService.js';

export default function App({ user, onLogout, initialMessage = '' }) {
  const canManage = ['super_admin', 'admin'].includes(user.role);
  const canUpload = user.role !== 'visitor';
  const canEdit = user.role !== 'visitor';
  const canUpdateExcel = !['visitor', 'executive'].includes(user.role);

  const [screen, setScreen] = useState("dashboard");

  const [view, setView] = useState("master");

  const [portal, setPortal] = useState("All portals");

  useEffect(() => {
    setPortal("All portals");
  }, [view]);

  const [modal, setModal] = useState(null);

  const [message, setMessage] = useState(initialMessage);
  const [migrating, setMigrating] = useState(false);

  const [importVersion, setImportVersion] = useState(0);

  const inventory = useInventory(view, screen);
  const {
    data,
    active,
    companies,
    selectedCompany,
    selectedCompanyId,
    companyList,
    portals,
    portalRecords,
    portalCounts,
    recordTotals,
    headers,
    columnMappings,
    applyShipmentSchema,
    commit,
    storageError,
    loadPortals,
    loadRecords,
    pagination,
    recordsReady,
    recordsLoading,
    legacyCount,
    migrateLegacy,
  } = inventory;

  const dismissToast = useCallback(
    () => setMessage(""),
    []
  );


  const closeModal = () => {
    setModal(null);
  };

  function navigate(
    nextScreen,
    nextView = view
  ) {
    setScreen(nextScreen);
    setView(nextView);
  }

  async function saveShipment(record) {
    if (!recordsReady || recordsLoading || migrating) throw new Error('Wait for database records to load before saving.');
    saveRecord(data, view, record, modal.index);
    const previous = modal.index === null ? null : data[view][modal.index];
    if (previous?._id) await updateShipmentRecord(previous._id, record);
    else {
      const result = await importShipmentRecords(view, [record], true);
      if (!result.added) throw new Error('This record already exists. Existing data was not changed.');
    }
    await loadRecords();
    await loadPortals(selectedCompanyId);

    closeModal();

    setMessage(
      shipmentStatus(record) === "Delivered"
        ? "Marked delivered and removed from in-transit view."
        : "Shipment saved."
    );
  }

  async function addPortal({
    companyId,
    name,
  }) {
    try {
      console.log(
        "Creating portal:",
        {
          companyId,
          name,
        }
      );

      const result =
        await createPortal({
          companyId,
          name,
        });
      await loadPortals(companyId);

      const portalName =
        result.data?.name || name;

      setPortal(portalName);

      setScreen("shipments");

      closeModal();

      setMessage(
        `${portalName} portal added.`
      );

      return result.data;
    } catch (error) {
      console.error(
        "Create portal error:",
        error
      );

      throw error;
    }
  }
  async function previewExcelImport(type, rows, newOnly = false) {
    if (!recordsReady || recordsLoading || migrating) throw new Error('Wait for database records to load before importing.');
    return previewShipmentImport(type, rows, user.role === 'executive' || newOnly);
  }

  async function importExcel(
    type,
    rows,
    newOnly = false
  ) {
    if (!recordsReady || recordsLoading || migrating) throw new Error('Wait for database records to load before importing.');
    const result = await importShipmentRecords(type, rows, user.role === 'executive' || newOnly);
    await loadPortals(selectedCompanyId);

    setView(type);

    setScreen("shipments");

    setPortal("All portals");

    setImportVersion(
      (value) => value + 1
    );

    closeModal();

    setMessage(
      `Saved: ${result.added} added, ${result.updated} updated, ${result.skipped || 0} existing/conflicting rows skipped.`
    );
  }

  async function importInvoice(invoice, newOnly = true) {
    if (!recordsReady || recordsLoading || migrating) throw new Error('Wait for database records to load before importing.');
    const preserveExisting = user.role === 'executive' || newOnly;
    let masterResult;
    try {
      masterResult = await importShipmentRecords('master', invoice.master, preserveExisting, true);
      const mergeResult = await importShipmentRecords('merge', invoice.merge, preserveExisting, true);
      await inventory.loadCompanies();
      const invoiceCompany = companyList.find(company => companyKey(company.name) === companyKey(invoice.master[0].Company));
      commit({ selectedCompany: invoiceCompany?.name || invoice.master[0].Company });
      await loadPortals(invoiceCompany?._id || selectedCompanyId);
      setView('master'); setScreen('shipments'); setPortal('All portals');
      setImportVersion(value => value + 1);
      await loadRecords();
      closeModal();
      setMessage(`Invoice saved. Master: ${masterResult.added} added, ${masterResult.updated} updated. Merge: ${mergeResult.added} added, ${mergeResult.updated} updated. Switch to Merge to see product lines.`);
    } catch (error) {
      if (masterResult) throw new Error(`Master was saved. Merge or refresh failed: ${error.message} Retry this invoice; existing rows will not be duplicated.`);
      throw error;
    }
  }

  const scopedActive =
    companyRecords(
      active,
      selectedCompany
    );

  const selectCompany = (name) => {
    commit({
      selectedCompany: name,
    });
    setPortal("All portals");
  };

  async function saveCompany(company) {
    const companyName =
      company?.name;

    if (!companyName) {
      return;
    }

    const next = {
      ...data,

      companies: [
        ...(data.companies || []).filter(
          (name) =>
            name !== companyName
        ),
        companyName,
      ],

      selectedCompany:
        companyName,

      portals: [],
    };

    await inventory.loadCompanies();
    commit({ selectedCompany: companyName });

    setPortal("All portals");

    closeModal();

    setMessage(
      `${companyName} company added.`
    );
  }
  const dashboard = screen === "dashboard";

  return (
    <div
      className={
        dashboard
          ? "dashboard-mode"
          : "shipment-mode"
      }
    >
      {/* // Sidebar */}
      <Sidebar
        screen={screen}
        view={view}
        onNavigate={navigate}
      />

      <main>
        {/* HEADER */}

        <Header
          screen={screen}
          user={user}
          onLogout={async () => { try { await onLogout(); } catch (error) { setMessage(error.message); } }}
          onManageUsers={canManage ? () => setModal({ type: 'users' }) : undefined}
          onActivity={canManage ? () => setModal({ type: 'activity' }) : undefined}
        />

        <section className="content">
          {screen === 'documents' ? <Documents user={user} /> : <>

          {/* PAGE TITLE */}
          <div className="page-title">
            <div>
              <div className="eyebrow">
                INVENTORY OPERATIONS
              </div>

              <h1>
                {dashboard
                  ? "Operations dashboard."
                  : view === "master"
                    ? "Master Shipment Sheet."
                    : "Merge Invoice Excel Sheet."}
              </h1>

              <p>
                {dashboard
                  ? "Your shipment activity, at a glance."
                  : view === "master"
                    ? "All imported shipments, including pending, dispatched and delivered records."
                    : "All imported invoice lines, including invoices for delivered shipments."}
              </p>
            </div>

            {/* PAGE ACTIONS */}
            <div className="page-actions">
              <button className="button secondary" disabled={!canUpload || !recordsReady || recordsLoading} onClick={() => setModal({ type: 'invoice' })}>↥ Upload Invoice PDF</button>
              <button className="button secondary" disabled={!canUpload} onClick={() => setModal({ type: 'upload', newOnly: true })}>＋ New upload</button>

              <button
                className="button secondary"
                disabled={!canUpdateExcel}
                onClick={() =>
                  setModal({
                    type: "upload",
                  })
                }
              >
                ↥ Upload Excel
              </button>

              <button
                className="button secondary"
                disabled={!canUpdateExcel}
                onClick={() =>
                  setModal({
                    type: "portal",
                  })
                }
              >
                ＋ Add portal
              </button>

            </div>
          </div>

          {/* COMPANY SELECTOR */}

          <CompanySelector
            canAdd={canManage}
            companies={companies}
            value={selectedCompany}
            onChange={selectCompany}
            onAdd={() =>
              setModal({
                type: "company",
              })
            }
          />

          {/* DASHBOARD / SHIPMENTS */}

          {!inventory.companiesReady ? <p role="status">Loading companies…</p> : dashboard ? (
            <Dashboard
              companyId={selectedCompanyId}
              refreshKey={importVersion}
              onOpenShipments={() =>
                navigate(
                  "shipments",
                  "master"
                )
              }
            />
          ) : (
            <Shipments
              canEdit={canEdit}
              canAdd={canUpload}
              key={`${view}-${importVersion}-${selectedCompany}`}
              view={view}
              data={data}
              loadRecords={loadRecords}
              pagination={pagination}
              recordsLoading={recordsLoading}
              active={scopedActive}
              companies={companyList}
              selectedCompany={
                selectedCompany
              }
              selectedCompanyId={selectedCompanyId}
              onCompanyChange={
                selectCompany
              }
              portals={portals}
              portalRecords={portalRecords}
              portalCounts={portalCounts}
              totals={recordTotals}
              headers={headers[view]}
              portal={portal}
              onPortalChange={
                setPortal
              }
              onViewChange={
                setView
              }
              onEdit={(index) =>
                setModal({
                  type: "record",
                  index,
                })
              }
              onAdd={() =>
                setModal({
                  type: "record",
                  index: null,
                })
              }
            />
          )}


          {canUpload && legacyCount > 0 && <div className="bottom-note">
            <span>{legacyCount} previous browser records can be copied to the database. Existing database rows will be kept.</span>
            <button className="button secondary" disabled={!recordsReady || recordsLoading || migrating} onClick={async () => {
              setMigrating(true);
              try { await migrateLegacy(); setMessage('Previous browser records saved to MongoDB.'); }
              catch (error) { setMessage(error.message); }
              finally { setMigrating(false); }
            }}>{migrating ? 'Saving…' : 'Save previous browser records'}</button>
          </div>}
          <div className="bottom-note">
            <span>
              <i className="live-dot" />

              {dashboard ? '' : view === 'master' ? 'Master sheet includes all shipment statuses' : 'Merge sheet includes all imported invoice lines'}
            </span>

            <span>
              {/* {recordsLoading ? 'Loading records from MongoDB…' : storageError || ''} */}
              {storageError && <button className="button secondary" disabled={recordsLoading} onClick={() => {
                inventory.loadCompanies(); loadRecords().catch(() => { });
              }}>Retry loading</button>}
            </span>
          </div>

          </>}
        </section>
      </main>


      {canUpload && (modal?.index === null || canEdit) && modal?.type === "record" && (
        <ShipmentForm
          companies={companies}
          selectedCompany={
            selectedCompany
          }
          type={view}
          headers={headers[view]}
          record={
            modal.index === null
              ? null
              : data[view][
              modal.index
              ]
          }
          portals={portals}
          selectedPortal={portal}
          onSave={saveShipment}
          onPodSaved={loadRecords}
          onClose={closeModal}
        />
      )}


      {canUpdateExcel && modal?.type === "portal" && (
        <PortalModal
          portals={portals}
          companyId={
            selectedCompanyId
          }
          onSave={addPortal}
          onClose={closeModal}
        />
      )}



      {canUpload && modal?.type === 'invoice' && <InvoiceUploadModal user={user} company={selectedCompany} companies={companies} onClose={closeModal} onPreview={(type,rows,newOnly)=>previewShipmentImport(type,rows,user.role==='executive'||newOnly,true)} onImport={importInvoice} />}

      {canUpload && modal?.type === "upload" && (
        <ExcelUploadModal
          newOnly={user.role === 'executive' || Boolean(modal.newOnly)}
          initialType={view}
          headers={headers}
          columnMappings={columnMappings}
          master={data.master}
          onPreview={previewExcelImport}
          onImport={importExcel}
          onSchemaApproved={applyShipmentSchema}
          onClose={closeModal}
        />
      )}


      {canManage && modal?.type === 'users' && <UserManagement user={user} onClose={closeModal} onCreated={createdUser => {
        closeModal();
        setMessage(`${createdUser.name} created successfully. They can now log in with their email and password.`);
      }} />}

      {canManage && modal?.type === 'activity' && <ActivityHistory user={user} onClose={closeModal} />}
      {canManage && modal?.type === "company" && (
        <CompanyModal
          onSave={saveCompany}
          onClose={closeModal}
        />
      )}


      <Toast
        message={message}
        onDismiss={dismissToast}
      />
    </div>
  );
}
