// Real Google Picker & Drive Integration

// Internal state flags
let pickerInited = false;

// OAuth scopes: Drive read, Picker photos, and drive.file for your app-specific files
const SCOPES =
    'https://www.googleapis.com/auth/drive.readonly ' +
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly ' +
    'https://www.googleapis.com/auth/drive.file';

const TOKEN_KEY = 'stamplicity_google_token';
const EXP_KEY = 'stamplicity_google_token_exp';

type GoogleGlobal = typeof window & {
    google?: any;
    gapi?: any;
};

const getGoogle = () => (window as unknown) as GoogleGlobal;

// ----------------------
// Token storage helpers
// ----------------------

export const checkGoogleConfig = (clientId?: string, developerKey?: string): boolean => {
    return Boolean(clientId && developerKey);
};

export const isGoogleConnected = (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    const exp = localStorage.getItem(EXP_KEY);
    if (!token || !exp) return false;

    const now = Date.now();
    const expTime = parseInt(exp, 10);
    if (Number.isNaN(expTime)) return false;

    return now < expTime;
};

export const getStoredToken = (): string | null => {
    if (!isGoogleConnected()) return null;
    return localStorage.getItem(TOKEN_KEY);
};

export const disconnectGoogle = (): void => {
    const google = getGoogle().google;
    const token = getStoredToken();

    if (token && google && google.accounts && google.accounts.oauth2) {
        try {
            google.accounts.oauth2.revoke(token, () => {
                console.log('Google token revoked');
            });
        } catch (e) {
            console.warn('Google revoke failed', e);
        }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
};

// ----------------------
// Initialization helpers
// ----------------------

/**
 * Waits until both GIS and gapi are available, and ensures the Picker API is loaded.
 * Times out after ~10 seconds with a helpful error.
 */
const waitForInit = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = () => {
            const { google, gapi } = getGoogle();

            const gisLoaded = !!(google && google.accounts && google.accounts.oauth2);
            const gapiLoaded = !!(gapi && gapi.load);

            if (gisLoaded && gapiLoaded) {
                if (!pickerInited) {
                    gapi.load('picker', () => {
                        pickerInited = true;
                        resolve();
                    });
                } else {
                    resolve();
                }
                return;
            }

            attempts += 1;

            if (attempts > 100) {
                reject(
                    new Error(
                        'Google API scripts failed to load. Please disable ad blockers and refresh the page.'
                    )
                );
                return;
            }

            setTimeout(check, 100);
        };

        check();
    });
};

// ----------------------
// Sign-in (popup flow)
// ----------------------

/**
 * Opens a Google OAuth popup and stores the access token + expiration in localStorage.
 * Uses GIS Token Client (implicit flow) and is intended for front-end only.
 */
export const signInToGoogle = async (clientId: string): Promise<void> => {
    await waitForInit();

    return new Promise((resolve, reject) => {
        const { google } = getGoogle();

        if (!google || !google.accounts || !google.accounts.oauth2) {
            reject(new Error('Google Identity Services not initialized'));
            return;
        }

        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (resp: any) => {
                    if (resp && resp.error) {
                        reject(new Error(`Authentication failed: ${resp.error}`));
                        return;
                    }

                    if (!resp || !resp.access_token) {
                        reject(new Error('No access token received from Google.'));
                        return;
                    }

                    const token: string = resp.access_token;
                    const expiresIn: number = resp.expires_in; // seconds

                    const expiresAt = Date.now() + expiresIn * 1000;
                    localStorage.setItem(TOKEN_KEY, token);
                    localStorage.setItem(EXP_KEY, expiresAt.toString());

                    resolve();
                },
            });

            // Popup-based flow; 'consent' ensures the user sees a dialog when necessary
            client.requestAccessToken({ prompt: 'consent' });
        } catch (e: any) {
            console.error('Token Client Init Error', e);
            reject(new Error(`Failed to initialize Google Sign-In: ${e?.message ?? e}`));
        }
    });
};

// ----------------------
// Picker integration
// ----------------------

/**
 * Opens the Google Picker and returns selected files as `File` objects.
 * Requires a valid stored token (user must be "connected" first).
 */
export const pickFilesFromGoogle = async (
    source: 'Drive' | 'Photos',
    clientId: string,
    developerKey: string,
    multiSelect: boolean = true
): Promise<File[]> => {
    try {
        await waitForInit();

        const token = getStoredToken();
        if (!token) {
            throw new Error('Not signed in. Please connect your Google account first.');
        }

        return new Promise((resolve, reject) => {
            const { google } = getGoogle();

            if (!google || !google.picker) {
                reject(new Error('Google Picker API not loaded'));
                return;
            }

            const pickerCallback = async (data: any) => {
                const action = data[google.picker.Response.ACTION];

                if (action === google.picker.Action.PICKED) {
                    const docs = data[google.picker.Response.DOCUMENTS] || [];
                    const files: File[] = [];

                    try {
                        for (const doc of docs) {
                            const fileId = doc[google.picker.Document.ID];
                            const name = doc[google.picker.Document.NAME];
                            const mimeType = doc[google.picker.Document.MIME_TYPE];
                            const file = await downloadFile(fileId, name, mimeType, token);
                            files.push(file);
                        }
                        resolve(files);
                    } catch (e) {
                        reject(new Error(`Failed to download files: ${(e as Error).message}`));
                    }
                } else if (action === google.picker.Action.CANCEL) {
                    resolve([]);
                }
            };

            const viewId =
                source === 'Photos' ? google.picker.ViewId.PHOTOS : google.picker.ViewId.DOCS_IMAGES;

            const width = Math.min(1050, window.innerWidth * 0.85);
            const height = Math.min(700, window.innerHeight * 0.85);

            const builder = new google.picker.PickerBuilder()
                .enableFeature(google.picker.Feature.NAV_HIDDEN)
                .setDeveloperKey(developerKey)
                .setAppId(clientId)
                .setOAuthToken(token)
                .setOrigin(`${window.location.protocol}//${window.location.host}`)
                .addView(viewId)
                .setSize(width, height)
                .setCallback(pickerCallback);

            if (multiSelect) {
                builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
            }

            if (source === 'Drive') {
                builder.addView(google.picker.ViewId.DOCS);
            }

            const picker = builder.build();
            picker.setVisible(true);
        });
    } catch (e) {
        console.error('Google Picker Error', e);
        throw e;
    }
};

// ----------------------
// Drive helpers
// ----------------------

const downloadFile = async (
    fileId: string,
    name: string,
    mimeType: string,
    token: string
): Promise<File> => {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Download Status ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new File([blob], name, { type: mimeType });
};

export const searchFile = async (name: string): Promise<string | null> => {
    const token = getStoredToken();
    if (!token) return null;

    try {
        const q = encodeURIComponent(`name = '${name}' and trashed = false`);
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }

        return null;
    } catch (e) {
        console.error('Search file error', e);
        return null;
    }
};

export const readFile = async (fileId: string): Promise<any | null> => {
    const token = getStoredToken();
    if (!token) return null;

    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Read file error', e);
        return null;
    }
};

export const createFile = async (name: string, content: any): Promise<string | null> => {
    const token = getStoredToken();
    if (!token) return null;

    const metadata = {
        name,
        mimeType: 'application/json',
    };

    const formData = new FormData();
    formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append(
        'file',
        new Blob([JSON.stringify(content)], { type: 'application/json' })
    );

    try {
        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            }
        );

        if (!response.ok) {
            console.error('Create file error: non-OK response', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        return data.id ?? null;
    } catch (e) {
        console.error('Create file error', e);
        return null;
    }
};

export const updateFile = async (fileId: string, content: any): Promise<boolean> => {
    const token = getStoredToken();
    if (!token) return false;

    try {
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content),
            }
        );

        return response.ok;
    } catch (e) {
        console.error('Update file error', e);
        return false;
    }
};

export const exportToGoogleDrive = async (stamps: any[]): Promise<string | null> => {
    const fileName = `stamplicity_export_${Date.now()}.json`;
    return await createFile(fileName, stamps);
};