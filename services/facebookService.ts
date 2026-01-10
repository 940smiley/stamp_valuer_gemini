
// Facebook SDK Integration

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

let isInitialized = false;

export const initFacebookSdk = (appId?: string): Promise<void> => {
    return new Promise((resolve) => {
        if (isInitialized) {
            resolve();
            return;
        }

        if (!appId) {
            console.warn("Facebook App ID not provided");
            resolve(); // Resolve anyway to avoid blocking, but FB calls will fail
            return;
        }

        window.fbAsyncInit = function() {
            window.FB.init({
                appId      : appId,
                cookie     : true,
                xfbml      : true,
                version    : 'v19.0'
            });
            isInitialized = true;
            resolve();
        };

        // Load SDK
        (function(d, s, id){
             var js, fjs = d.getElementsByTagName(s)[0];
             if (d.getElementById(id)) {resolve(); return;}
             js = d.createElement(s) as HTMLScriptElement; js.id = id;
             js.src = "https://connect.facebook.net/en_US/sdk.js";
             if(fjs.parentNode) fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    });
};

export const loginToFacebook = (): Promise<{ accessToken: string, userID: string }> => {
    return new Promise((resolve, reject) => {
        if (!window.FB) {
            reject(new Error("Facebook SDK not loaded"));
            return;
        }

        window.FB.login((response: any) => {
            if (response.authResponse) {
                resolve({
                    accessToken: response.authResponse.accessToken,
                    userID: response.authResponse.userID
                });
            } else {
                reject(new Error("User cancelled login or did not fully authorize."));
            }
        }, { scope: 'pages_manage_posts,pages_read_engagement' });
    });
};

export const postToFacebook = async (message: string, imageUrl?: string, accessToken?: string): Promise<boolean> => {
    if (!accessToken) throw new Error("No access token provided");

    // For simplicity in this demo, we post to the user's feed (me/feed) or a page if selected.
    // Ideally, we'd list pages and let user select one. 
    // Here we'll try to post to the User's feed or the first available page.
    
    return new Promise((resolve, reject) => {
        // 1. Get Accounts (Pages)
        window.FB.api('/me/accounts', 'get', { access_token: accessToken }, (response: any) => {
            if (response && response.data && response.data.length > 0) {
                // Post to first page found
                const page = response.data[0];
                const pageToken = page.access_token;
                const pageId = page.id;

                const payload: any = { message: message, access_token: pageToken };
                if (imageUrl) payload.link = imageUrl; // Only works if URL is public, otherwise use file upload flow which is complex for client-side only

                window.FB.api(`/${pageId}/feed`, 'post', payload, (res: any) => {
                    if (res && !res.error) resolve(true);
                    else reject(res.error);
                });
            } else {
                // Fallback to user feed (permissions might restrict this in modern API versions)
                window.FB.api('/me/feed', 'post', { message, access_token: accessToken }, (res: any) => {
                    if (res && !res.error) resolve(true);
                    else reject(res.error);
                });
            }
        });
    });
};
