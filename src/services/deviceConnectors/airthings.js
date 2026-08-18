/**
 * Airthings Cloud API connector. Airthings' API uses OAuth2 client-credentials
 * with a client secret — that secret can't be safely shipped to the browser,
 * so this connector cannot run client-side like PurpleAir or Awair Local.
 *
 * A backend proxy endpoint would need to hold the client secret, call
 * https://api-docs.airthings.com/ on the app's behalf (exchange for an access
 * token, then GET the latest device samples), and return the reading to the
 * frontend. This connector is registered so it's selectable in the UI and the
 * limitation is explained there, but fetchReading intentionally throws until
 * such a proxy exists.
 */

export const id = "airthings";
export const label = "Airthings (requires backend proxy)";
export const suppliedFields = [];
export const configFields = [];

export async function fetchReading() {
    throw new Error(
        "Airthings requires a backend proxy to hold your API client secret — not available client-side yet."
    );
}