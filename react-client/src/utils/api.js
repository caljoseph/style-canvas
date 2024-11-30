export const authFetch = async (url, options = {}) => {
    const accessToken = localStorage.getItem('accessToken');

    if (!options.headers) {
        options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${accessToken}`;

    let response = await fetch(url, options);

    if (response.status === 401 || !accessToken) {
        console.log("trying to refresh accessToken");
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            options.headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, options);
        } else {
            window.location.href = './registration.html';
            return null;
        }
    }
    return response;
};

export const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await fetch('/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.accessToken;
        }

        localStorage.removeItem('refreshToken');
        return null;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        return null;
    }
};