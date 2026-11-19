// Microsoft Graph / To Do starter integration. Fill in the tenant/client ID in config.js.
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, graphScopes } from './config.js';
let client;
export async function initializeMicrosoft() {
  if (!msalConfig.auth.clientId) throw new Error('Set your Microsoft Entra client ID in src/lib/config.js first.');
  client = new PublicClientApplication(msalConfig);
  await client.initialize();
  return client;
}
export async function signInMicrosoft() {
  if (!client) await initializeMicrosoft();
  const result = await client.loginPopup({scopes:graphScopes});
  return result.account;
}
export async function graphRequest(path) {
  if (!client) await initializeMicrosoft();
  const account = client.getAllAccounts()[0];
  if (!account) throw new Error('Please sign in to Microsoft first.');
  let token;
  try { token = await client.acquireTokenSilent({account,scopes:graphScopes}); }
  catch { token = await client.acquireTokenPopup({account,scopes:graphScopes}); }
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {headers:{Authorization:`Bearer ${token.accessToken}`}});
  if (!response.ok) throw new Error(`Microsoft Graph error: ${response.status} ${response.statusText}`);
  return response.json();
}
export async function listTodoLists() { return graphRequest('/me/todo/lists'); }
export async function listTasks(listId) { return graphRequest(`/me/todo/lists/${encodeURIComponent(listId)}/tasks`); }
export async function createTask(listId, title) {
  if (!client) await initializeMicrosoft();
  const account=client.getAllAccounts()[0]; if(!account) throw new Error('Sign in first.');
  let token; try {token=await client.acquireTokenSilent({account,scopes:graphScopes});} catch {token=await client.acquireTokenPopup({account,scopes:graphScopes});}
  const r=await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${encodeURIComponent(listId)}/tasks`,{method:'POST',headers:{Authorization:`Bearer ${token.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({title})});
  if(!r.ok) throw new Error(`Graph task create failed: ${r.status}`); return r.json();
}
