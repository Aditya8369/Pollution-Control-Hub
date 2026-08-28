const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiClient(pathSegments, options = {}) {
    const { params = {}, defaultError = 'Request failed', signal, method = 'GET', body } = options;
    
    const base = API_BASE.replace(/\/+$/, '');
    const path = Array.isArray(pathSegments)
        ? pathSegments.map(segment => encodeURIComponent(segment)).join('/')
        : pathSegments;
        
    let urlString = `${base}/${path}`;
    const url = (urlString.startsWith('http') || typeof window === 'undefined')
        ? new URL(urlString, 'http://localhost')
        : new URL(urlString, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    let finalUrl = url.toString();
    if (finalUrl.startsWith('http://localhost') && urlString.startsWith('/')) {
        finalUrl = finalUrl.replace('http://localhost', '');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(finalUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal
    });

    if (!response.ok) {
        let errorMessage = defaultError;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // ignore
            }
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
