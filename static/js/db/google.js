import {sleep} from "../test/func.js";

export const API_KEY = 'AIzaSyBTTqB_rSfwzuTIdF1gcQ5-U__fGzrQ_zs';
export const spreadsheetId = '13zsZqGICZKQYMCcGkhgr7pzhH1z-LWFiH0LMrI6NGLM';
const CLIENT_ID = '21469279904-9vlmm4i93mg88h6qb4ocd2vvs612ai4u.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;

class ORM {
    constructor(columns=[]) {
        this.columns = columns
    }

    getRaw(data = {}){
        let result = [];
        this.columns.forEach((value, index)=>{
            result[index] = data[value];
        });
        return result;
    }

    getFormated(data=[]){
        let result = {};
        this.columns.forEach((value, index)=>{
            result[value] = data[index];
        });
        return result;
    };

}

export class Table {
    constructor(options) {
        this.list = options.list;
        this.sheets = {}
        this.spreadsheetId = options.spreadsheetId;
        this.api = options.api;
        this.spreadsheets = gapi.client.sheets.spreadsheets;
    }

    async getSheetIdByName(sheetName) {
        if (this.sheets[sheetName]) return this.sheets[sheetName];
        const response = await this.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
        });

        const sheet = response.result.sheets.find(
            (s) => s.properties.title === sheetName
        );
        const sheetId = sheet ? sheet.properties.sheetId : null;
        this.sheets[sheetName] = sheetId
        return sheetId;
    }

    async addRow(values = {}) {
        if (!this.api.columns[this.list]) console.error(this.api.columns);
        let table = new ORM(this.api.columns[this.list]);
        let rawValue = table.getRaw(values)
        try {
            let res = await this.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: this.list + '!A1:Z1',
                valueInputOption: "RAW",
                insertDataOption: "INSERT_ROWS",
                resource: {
                    majorDimension: "ROWS",
                    values: [rawValue],
                    //values: [["Engine", "$100", "1", "3/20/2016"]],
                }
            });
            console.log(res);
        } catch (e) {
            console.error(e)
        }

    }


    async deleteRow(rowIndex) {
        const sheetId = await this.getSheetIdByName(this.list);

        if (sheetId === null) {
            throw new Error("Лист 'API' не найден");
        }

        await this.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: "ROWS",
                                startIndex: rowIndex-1,
                                endIndex: rowIndex
                            }
                        }
                    }
                ]
            }
        });
    }

    updateRow(row, values){
        if (!this.api.columns[this.list]) console.error(this.api.columns);
        let table = new ORM(this.api.columns[this.list]);
        let rawValue = table.getRaw(values)
        gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: this.list+'!A'+row,
            valueInputOption: 'RAW',
            resource: {
                values: [rawValue]
            }
        }).then((response) => {
            console.log('Value updated successfully:', response);
        }).catch((err) => {
            console.log('Value update failed:', err);
        });
    }

    createList(title){
        this.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: title, // Название нового листа
                        }
                    }
                }
            ]
        }).then((response) => {
            console.log('Лист добавлен:', response.result.replies[0].addSheet.properties.sheetId);
        }).catch((error) => {
            console.error('Ошибка при добавлении листа:', error);
        });
    }

    createSpreadSheet(title, callback=null) {
        try {
            this.spreadsheets.create({
                properties: {
                    title: title,
                },
            }).then((response) => {
                if (callback) callback(response);
                console.log('Spreadsheet ID: ' + response.result.spreadsheetId);
            });
        } catch (err) {
            console.error(err.message)
            return;
        }
    }

    async clearList() {
        await this.spreadsheets.values.clear({
            spreadsheetId: this.spreadsheetId,
            range: this.list + '!A2:Z1000',
        });
    }

    async getRow(row) {
        return await this.api.fetchSheetValues(this.list + '!' + 'A' + row + ':Z' + row);
    }
}

export class GoogleSheetDB {
    constructor(options={}) {
        this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

        this.apiKey = options.apiKey;
        this.tokenClient = {}
        this.spreadsheetId = options.spreadsheetId;
        this.headers = [];
        this.columns = {};
        this.storedToken = localStorage.getItem('gapi_token');
        this.callback = options.callback;
        loadScriptOnce({
            src: 'https://apis.google.com/js/api.js',
            onload: this.gapiLoaded.bind(this),
        });

        loadScriptOnce({
            src: 'https://accounts.google.com/gsi/client',
            onload: this.gisLoaded.bind(this),
        });

        let timer = setInterval(async () => {
            let worked = localStorage.getItem('gapi_token_expires') - this.getTime();
            document.getElementById('signout_button').textContent = worked;
            if (worked < 10) {
                alert('нужно авторизоваться');
                clearInterval(timer);
            }
        })
    }

    getTime(){
        return Math.floor(Date.now() / 1000)
    }

    async gapiLoaded(){
        gapi.load('client', this.initializeGapiClient.bind(this));
    }


    maybeEnableButtons() {
        if (gapiInited && gisInited) {
            document.getElementById('authorize_button').style.visibility = 'visible';
        }
    }

    async initializeGapiClient() {
        await gapi.client.init({
            apiKey: this.apiKey,
            discoveryDocs: [this.DISCOVERY_DOC],
        });

        if (this.storedToken) {
            try {
                const parsedToken = JSON.parse(this.storedToken);
                gapi.client.setToken(parsedToken);
            } catch (e) {
                console.warn('Failed to parse stored token:', e);
            }
        }

        gapiInited = true;
        this.callback();

        this.maybeEnableButtons();
    }

    gisLoaded() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => {}, // пустой, определим в handleAuthClick
        });
        gisInited = true;
        this.maybeEnableButtons();
        this.eventHandler();
    }

    eventHandler() {
        document.getElementById('authorize_button').onclick = this.handleAuthClick.bind(this);

        document.getElementById('signout_button').onclick = this.handleSignoutClick.bind(this);
    }

    handleAuthClick() {
        this.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            document.getElementById('signout_button').style.visibility = 'visible';
            document.getElementById('authorize_button').innerText = 'Refresh';

            // Сохраняем токен в localStorage
            const token = gapi.client.getToken();
            localStorage.setItem('gapi_token', JSON.stringify(token));
            localStorage.setItem('gapi_token_expires', JSON.stringify( this.getTime() + resp.expires_in));


        };

        if (gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            this.tokenClient.requestAccessToken({prompt: ''});
        }
    }

    handleSignoutClick() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            localStorage.removeItem('gapi_token'); // удаляем токен из localStorage
            document.getElementById('content').innerText = '';
            document.getElementById('authorize_button').innerText = 'Authorize';

        }
    }

    async fetchSheetValues(range) {
        let response;
        try {
            response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range,
            });
        } catch (err) {
            console.error(err.message);
            return [];
        }
        const result = response.result;
        if (!result || !result.values || result.values.length === 0) {
            console.error('No values found.');
            return [];
        }
        return result.values;
    }

    async getAll(list = false) {
        await this.getColumns(list);
        const range = (list ? list + '!' : '') + 'A1:B100';
        return await this.fetchSheetValues(range);
    }

    async getColumns(list) {
        if (this.columns[list]) return;
        const range = (list ? list + '!' : '') + 'A1:Z1';
        const values = await this.fetchSheetValues(range);
        if (values.length > 0) {
            this.columns[list] = values[0];
        }
    }
}

function loadScriptOnce({ src, onload, async = true, defer = true }) {
    // Проверяем, не загружен ли уже скрипт
    const existingScript = Array.from(document.getElementsByTagName('script'))
        .find(script => script.src === src);

    if (existingScript) {
        console.log(`Скрипт уже загружен: ${src}`);
        return;
    }

    // Создаём новый <script> элемент
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    if (onload && typeof onload === 'function') {
        script.onload = onload;
    }

    // Вставляем скрипт в <head>
    document.head.appendChild(script);
}


