// Google Picker & Drive Integration — Clean Rewrite

const getGoogle = () => (window as any).google;
const getGapi = () => (window as any).gapi;

let pickerInited = false;
let tokenClient: any = null;

// Global handlers for the singleton token client
let pendingResolve: (() => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

// Simplified scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
].join(' ');

const TOKEN_KEY = 'stamplicity_google_token';
const EXP_KEY = 'stamplicity_google_token_exp';

// ----------------------
// Token Storage
// ----------------------

export const checkGoogleConfig = (clientId?: string, developerKey?: string): boolean => {
  return Boolean(clientId && developerKey);
};

export const isGoogleConnected = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expStr = localStorage.getItem(EXP_KEY);
  const exp = parseInt(expStr || '0', 10);
  return !!token && Date.now() < exp;
};

export const getStoredToken = (): string | null => {
  return isGoogleConnected() ? localStorage.getItem(TOKEN_KEY) : null;
};

export const disconnectGoogle = (): void => {
  const token = getStoredToken();
  const google = getGoogle();
  if (token && google?.accounts?.oauth2?.revoke) {
    try {
      google.accounts.oauth2.revoke(token, () => console.log('Token revoked'));
    } catch (e) {
      console.warn('Revoke failed', e);
    }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXP_KEY);
};

// ----------------------
// Initialization
// ----------------------

const waitForInit = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const google = getGoogle();
      const gapi = getGapi();
      const gisReady = !!google?.accounts?.oauth2;
      const gapiReady = !!gapi?.load;

      if (gisReady && gapiReady) {
        if (!pickerInited) {
          gapi.load('picker', () => {
            pickerInited = true;
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        attempts++;
        if (attempts > 100) {
          reject(new Error('Google APIs failed to load. Please disable ad blockers and refresh the page.'));
        } else {
          setTimeout(check, 100);
        }
      }
    };
    check();
  });
};

// ----------------------
// Sign-In (Popup Flow)
// ----------------------

export const signInToGoogle = async (clientId: string): Promise<void> => {
  await waitForInit();

  return new Promise((resolve, reject) => {
    try {
      const google = getGoogle();

      // Cancel any existing pending request to avoid race conditions
      if (pendingReject) {
        pendingReject(new Error('Interrupted by new sign-in request'));
        pendingResolve = null;
        pendingReject = null;
      }

      pendingResolve = resolve;
      pendingReject = reject;

      // Initialize token client only once (Singleton pattern)
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error !== undefined) {
              if (pendingReject) pendingReject(new Error(`OAuth Error: ${resp.error}`));
            } else if (resp.access_token) {
              const expiresAt = Date.now() + resp.expires_in * 1000;
              localStorage.setItem(TOKEN_KEY, resp.access_token);
              localStorage.setItem(EXP_KEY, expiresAt.toString());
              if (pendingResolve) pendingResolve();
            }
            // Cleanup
            pendingResolve = null;
            pendingReject = null;
          },
          error_callback: (err: any) => {
             console.error("GIS Error Callback", err);
             // Ignore 'popup_closed' if we actually got a token (rare race condition), otherwise reject
             if (pendingReject) {
                 pendingReject(new Error(`Google Sign-In Error: ${err.type} - ${err.message}`));
             }
             pendingResolve = null;
             pendingReject = null;
          }
        });
      }

      // Use an empty prompt to default to the most standard behavior (signin or select account).
      // 'consent' forces the permissions screen every time, which can cause 'popup_closed' errors
      // if the browser closes the window too quickly after a redirect.
      tokenClient.requestAccessToken({ prompt: '' });

    } catch (e: any) {
      if (pendingReject) pendingReject(e);
      pendingResolve = null;
      pendingReject = null;
      reject(new Error(`GIS init failed: ${e.message}`));
    }
  });
};

// ----------------------
// Picker Integration
// ----------------------

export const pickFilesFromGoogle = async (
  source: 'Drive' | 'Photos',
  clientId: string,
  developerKey: string,
  multiSelect = true
): Promise<File[]> => {
  await waitForInit();

  const token = getStoredToken();
  if (!token) throw new Error('Not signed in. Please connect your Google account.');

  return new Promise((resolve, reject) => {
    const google = getGoogle();
    if (!google?.picker) {
      reject(new Error('Google Picker API not loaded'));
      return;
    }

    const pickerCallback = async (data: any) => {
      const action = data[google.picker.Response.ACTION];
      if (action === google.picker.Action.PICKED) {
        try {
          const docs = data[google.picker.Response.DOCUMENTS];
          const files = await Promise.all(
            docs.map((doc: any) =>
              downloadFile(
                doc[google.picker.Document.ID],
                doc[google.picker.Document.NAME],
                doc[google.picker.Document.MIME_TYPE],
                token
              )
            )
          );
          resolve(files);
        } catch (e) {
          reject(new Error(`Download failed: ${(e as Error).message}`));
        }
      } else if (action === google.picker.Action.CANCEL) {
        resolve([]);
      }
    };

    const viewId =
      source === 'Photos' ? google.picker.ViewId.PHOTOS : google.picker.ViewId.DOCS_IMAGES;

    const builder = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(developerKey)
      .setAppId(clientId)
      .setOAuthToken(token)
      .setOrigin(`${window.location.protocol}//${window.location.host}`)
      .addView(viewId)
      .setSize(Math.min(1050, window.innerWidth * 0.85), Math.min(700, window.innerHeight * 0.85))
      .setCallback(pickerCallback);

    if (multiSelect) builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
    if (source === 'Drive') builder.addView(google.picker.ViewId.DOCS);

    const picker = builder.build();
    picker.setVisible(true);
  });
};

// ----------------------
// Drive Helpers
// ----------------------

const downloadFile = async (
  fileId: string,
  name: string,
  mimeType: string,
  token: string
): Promise<File> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const blob = await res.blob();
  return new File([blob], name, { type: mimeType });
};

export const searchFile = async (name: string): Promise<string | null> => {
  const token = getStoredToken();
  if (!token) return null;

  const q = encodeURIComponent(`name = '${name}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
};

export const readFile = async (fileId: string): Promise<any | null> => {
  const token = getStoredToken();
  if (!token) return null;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok ? await res.json() : null;
};

export const createFile = async (name: string, content: any): Promise<string | null> => {
  const token = getStoredToken();
  if (!token) return null;

  const metadata = { name, mimeType: 'application/json' };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  return data.id ?? null;
};

export const updateFile = async (fileId: string, content: any): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  const res = await fetch(
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

  return res.ok;
};

export const exportToGoogleDrive = async (stamps: any[]): Promise<string | null> => {
  const fileName = `stamplicity_export_${Date.now()}.json`;
  return await createFile(fileName, stamps);
};
