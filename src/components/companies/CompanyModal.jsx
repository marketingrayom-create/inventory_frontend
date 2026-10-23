import { useState } from "react";
import { createCompany } from "../../services/companyService";
import Modal from "../common/Modal";

export default function CompanyModal({
  onSave,
  onClose,
}) {
  const [name, setName] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState(
    "A21TJRUUN4KGV"
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await createCompany({
        name,
        merchantId,
        marketplaceId,
      });
      onSave(result.data);
      onClose();
    } catch (failure) {
      console.error(
        "Create company error:",
        failure
      );

      setError(
        failure.message ||
        "Failed to create company"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      id="companyDialog"
      title="Add a company"
      eyebrow="YOUR WORKSPACE"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <button
          className="button primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add company"}
        </button>
      }
    >
      <div className="portal-fields">
        <p>
          Add a company to use it in Master Shipment
          and Merge Shipment. The new company will be
          selected automatically.
        </p>

        <label>
          Company name

          <input
            required
            maxLength={150}
            autoComplete="organization"
            placeholder="e.g. Example Private Limited"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
          />
        </label>

        <label>
          Amazon Merchant ID

          <input
            maxLength={100}
            placeholder="e.g. AJ5FMEI83TM5Z"
            value={merchantId}
            onChange={(event) =>
              setMerchantId(event.target.value)
            }
          />
        </label>

        <label>
          Marketplace ID

          <input
            maxLength={100}
            placeholder="e.g. A21TJRUUN4KGV"
            value={marketplaceId}
            onChange={(event) =>
              setMarketplaceId(event.target.value)
            }
          />
        </label>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}