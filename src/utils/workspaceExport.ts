import { Revenue } from "../types";

export async function exportToGoogleSheets(
  accessToken: string, 
  revenues: Revenue[]
): Promise<string | null> {
  try {
    // 1. Create a new Spreadsheet
    const dateStr = new Date().toISOString().split('T')[0];
    const title = `Bilan_Comptable_Nordique_${dateStr}`;
    
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title
        }
      })
    });
    
    if (!createRes.ok) throw new Error('Echec de la creation du fichier Sheets');
    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    
    // 2. Prepare data
    const values = [
      ['Date', 'Établissement', 'Statut', 'Revenu Total', 'Espèces', 'CB', 'Tickets Resto', 'Pourboires', 'Notes']
    ];
    
    revenues.forEach(rev => {
      values.push([
        rev.date,
        rev.establishmentId,
        rev.service || '',
        rev.total.toString(),
        rev.payments.cash.toString(),
        rev.payments.cb.toString(),
        rev.payments.tr.toString(),
        '0', // tips
        rev.notes || ''
      ]);
    });

    // 3. Update data
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Feuille 1!A1:I:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    });
    
    // Sometimes it's named "Sheet1" if the default locale is english. Let's do a fallback update.
    if (!updateRes.ok) {
       await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:I:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values
        })
      });
    }

    return spreadsheetId;
  } catch (error) {
    console.error("Erreur Export Workspace", error);
    return null;
  }
}
