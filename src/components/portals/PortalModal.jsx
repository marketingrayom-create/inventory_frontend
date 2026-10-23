import { useState } from "react";
import Modal from "../common/Modal.jsx";

export default function PortalModal({
  portals,
  companyId,
  onSave,
  onClose,
}) {
  
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const portal = name.trim();

    if (!portal) {
      setError("Enter a portal name.");
      return;
    }

    if (!companyId) {
      setError("Please select a company first.");
      return;
    }

    if (
      ["All portals", ...portals].some(
        (existing) =>
          existing.toLowerCase() ===
          portal.toLowerCase()
      )
    ) {
      setError("This portal already exists.");
      return;
    }

    try {
      setLoading(true);

      await onSave({
        name: portal,
        companyId,
      });

      setName("");
    } catch (failure) {
      console.error(
        "Add portal error:",
        failure
      );

      setError(
        failure.message ||
        "Failed to add portal"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      id="portalDialog"
      title="Add a portal"
      eyebrow="YOUR MARKETPLACES"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <button
          className="button primary"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Adding..."
            : "Add portal"}
        </button>
      }
    >
      <div className="portal-fields">
        <p>
          Create a portal and its tab will
          appear in both shipment views.
        </p>

        <label>
          Portal name

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
            maxLength={60}
            placeholder="e.g. Meesho, Myntra, Ajio"
            autoComplete="off"
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