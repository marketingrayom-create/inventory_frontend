import { apiFetch, API_BASE_URL as API_ROOT } from './apiClient.js';
import { readApiResponse } from './apiResponse.js';

const API_BASE_URL =
    `${API_ROOT.replace(/\/companies$/, '')}/companies`;


// CREATE COMPANY
export const createCompany = async ({
    name,
    merchantId,
    marketplaceId,
}) => {
    const response = await apiFetch(`${API_BASE_URL}/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            merchantId: merchantId?.trim() || null,
            marketplaceId: marketplaceId?.trim() || null,
        }),
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message || "Failed to create company"
        );
    }

    return result;
};


// GET ALL COMPANIES
export const getCompanies = async () => {
    const response = await apiFetch(
        `${API_BASE_URL}/allcompanies`
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message || "Failed to fetch companies"
        );
    }

    return result;
};


// GET COMPANY BY ID
export const getCompanyById = async (companyId) => {
    const response = await apiFetch(
        `${API_BASE_URL}/${companyId}`
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message || "Failed to fetch company"
        );
    }

    return result;
};


// CONNECT AMAZON
export const connectAmazon = async ({
    companyId,
    merchantId,
    marketplaceId,
}) => {
    const response = await apiFetch(
        `${API_BASE_URL}/${companyId}/amazon`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                merchantId,
                marketplaceId,
            }),
        }
    );

    const result = await readApiResponse(response);

    if (!response.ok) {
        throw new Error(
            result.message || "Failed to connect Amazon"
        );
    }

    return result;
};
