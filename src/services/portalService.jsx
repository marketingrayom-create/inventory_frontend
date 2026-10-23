import { apiFetch, API_BASE_URL } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';


export async function resolveImportPortals(rows) {
    const pairs = [...new Map(rows.map(row => [JSON.stringify([row.Company, row.Portal]),
        { company: row.Company, portal: row.Portal }])).values()];
    const response = await apiFetch(`${API_BASE_URL}/portal/resolve-import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs }),
    });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || 'Could not resolve import portals.');
    return result.data;
}


// ADD PORTAL

export const createPortal = async ({
    companyId,
    name,
}) => {
    const response = await apiFetch(
        `${API_BASE_URL}/portal/add`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                companyId,
                name,
            }),
        }
    );

    const result =
        await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Failed to add portal"
        );
    }

    return result;
};


// GET PORTALS BY COMPANY

export const getPortals = async (
    companyId
) => {
    if (!companyId) {
        throw new Error(
            "Company ID is required"
        );
    }

    const response = await apiFetch(
        `${API_BASE_URL}/portal/all?companyId=${encodeURIComponent(
            companyId
        )}`
    );

    const result =
        await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Failed to fetch portals"
        );
    }

    return result;
};


// GET SINGLE PORTAL

export const getPortalById = async (
    portalId
) => {
    const response = await apiFetch(
        `${API_BASE_URL}/portal/${portalId}`
    );

    const result =
        await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Failed to fetch portal"
        );
    }

    return result;
};


// UPDATE PORTAL

export const updatePortal = async (
    portalId,
    data
) => {
    const response = await apiFetch(
        `${API_BASE_URL}/portal/${portalId}`,
        {
            method: "PATCH",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify(data),
        }
    );

    const result =
        await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Failed to update portal"
        );
    }

    return result;
};


// DELETE PORTAL

export const deletePortal = async (
    portalId
) => {
    const response = await apiFetch(
        `${API_BASE_URL}/portal/${portalId}`,
        {
            method: "DELETE",
        }
    );

    const result =
        await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message ||
            "Failed to delete portal"
        );
    }

    return result;
};
