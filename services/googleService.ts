
// Real Google Picker Integration
// Note: This requires the Google API scripts to be loaded in index.html

let tokenClient: any = null;
let accessToken: string | null = null;
let pickerInited = false;
let gisInited = false;

// Scopes required for Picker and Downloading files
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photospicker.mediaitems.readonly';

export const checkGoogleConfig = (clientId?: string, developerKey?: string) => {
    return !!clientId && !!developerKey;
};

// Initialize the Google API client and Token Client
export const initGooglePicker = (clientId: string) => {
    if (gisInited) return; // Already initialized

    // GIS (Google Identity Services)
    if ((window as any).google) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error !== undefined) {
                    throw response;
                }
                accessToken = response.access_token;
            },
        });
        gisInited = true;
    }

    // GAPI (Google API Client) - Load Picker
    if ((window as any).gapi) {
        (window as any).gapi.load('picker', () => {
            pickerInited = true;
        });
    }
};

const waitForInit = async (clientId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            if (gisInited && pickerInited) {
                resolve();
            } else {
                if (!gisInited) initGooglePicker(clientId);
                attempts++;
                if (attempts > 20) { // 2 seconds timeout
                    reject("Google API scripts failed to load. Please check your internet connection.");
                } else {
                    setTimeout(check, 100);
                }
            }
        };
        check();
    });
};

const getOAuthToken = (clientId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) initGooglePicker(clientId);

        // Trigger the GIS flow to get token
        // We override the callback to capture this specific request
        tokenClient.callback = (resp: any) => {
            if (resp.error) {
                reject(`OAuth Error: ${resp.error}`);
            }
            accessToken = resp.access_token;
            resolve(accessToken!);
        };

        // Skip prompt if we have a valid token (handled by GIS automatically mostly, but we can hint)
        tokenClient.requestAccessToken({ prompt: '' });
    });
};

export const pickFileFromGoogle = async (
    source: 'Drive' | 'Photos',
    clientId: string,
    developerKey: string
): Promise<File | null> => {
    try {
        await waitForInit(clientId);

        // Ensure we have a token
        const token = await getOAuthToken(clientId);

        return new Promise((resolve, reject) => {
            const google = (window as any).google;
            const gapi = (window as any).gapi;

            if (!google || !gapi) {
                reject("Google API not fully loaded");
                return;
            }

            const pickerCallback = async (data: any) => {
                if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                    const doc = data[google.picker.Response.DOCUMENTS][0];
                    const fileId = doc[google.picker.Document.ID];
                    const name = doc[google.picker.Document.NAME];
                    const mimeType = doc[google.picker.Document.MIME_TYPE];

                    // Download the file content
                    try {
                        const file = await downloadFile(fileId, name, mimeType, token);
                        resolve(file);
                    } catch (e) {
                        reject(`Failed to download selected file: ${e}`);
                    }
                } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
                    resolve(null);
                }
            };

            const viewId = source === 'Photos' ? google.picker.ViewId.PHOTOS : google.picker.ViewId.DOCS_IMAGES;

            // Calculate center position or use default behavior with explicit size
            const width = Math.min(1050, window.innerWidth * 0.85);
            const height = Math.min(700, window.innerHeight * 0.85);

            try {
                const picker = new google.picker.PickerBuilder()
                    .enableFeature(google.picker.Feature.NAV_HIDDEN)
                    .setDeveloperKey(developerKey)
                    .setAppId(clientId)
                    .setOAuthToken(token)
                    .setOrigin(window.location.protocol + '//' + window.location.host) // Explicit origin setting to prevent 400 relay errors
                    .addView(viewId)
                    .addView(google.picker.ViewId.DOCS) // Fallback/Browse
                    .setSize(width, height) // Set explicit size for better visibility
                    .setCallback(pickerCallback)
                    .build();

                picker.setVisible(true);
            } catch (e) {
                reject("Failed to construct Google Picker. Please verify Client ID and API Key.");
            }
        });

    } catch (e) {
        console.error("Google Picker Error", e);
        throw e;
    }
};

const downloadFile = async (fileId: string, name: string, mimeType: string, token: string): Promise<File> => {
    // For Drive files, use the API
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new File([blob], name, { type: mimeType });
};

export const exportToGoogleDrive = async (stamps: any[]) => {
    // Placeholder for export logic
    return new Promise<boolean>((resolve) => {
        setTimeout(() => {
            console.log("Exporting to drive (simulated for security restrictions)", stamps);
            resolve(true);
        }, 1500);
    });
};
