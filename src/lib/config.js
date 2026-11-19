// Configure this app registration in Microsoft Entra ID before using Microsoft To Do.
export const msalConfig = {
  auth: { clientId: '', authority: 'https://login.microsoftonline.com/common', redirectUri: window.location.origin + window.location.pathname },
  cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false }
};
export const graphScopes = ['User.Read', 'Tasks.ReadWrite'];
