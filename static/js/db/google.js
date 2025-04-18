export const API_KEY = 'AIzaSyBTTqB_rSfwzuTIdF1gcQ5-U__fGzrQ_zs';
export const spreadsheetId = '13zsZqGICZKQYMCcGkhgr7pzhH1z-LWFiH0LMrI6NGLM';
const CLIENT_ID = '21469279904-9vlmm4i93mg88h6qb4ocd2vvs612ai4u.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';



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
        this.api = window.GoogleSheetDB || new GoogleSheetDB();
        this.spreadsheets = gapi.client.sheets.spreadsheets;
        this.columns = {};
        this.codes = {};
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
        if (!this.columns[this.list]) console.error(this.columns);
        let table = new ORM(this.columns[this.list]);
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
    async addColumns(values = []) {
        try {
            let res = await this.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: this.list + '!A1:Z1',
                valueInputOption: "RAW",
                insertDataOption: "INSERT_ROWS",
                resource: {
                    majorDimension: "ROWS",
                    values: [values],
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

    async updateRow(row, values) {
        if (!this.columns[this.list]) {
            await this.getColumns(this.list);
        }
        let table = new ORM(this.columns[this.list]);
        let rawValue = table.getRaw(values)
        gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: this.list + '!A' + row,
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

    async getLists() {
        let response = await this.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
            fields: 'sheets.properties.title'
        });
        return response.result.sheets;
    }
    async createList(title) {
        // Сначала получаем информацию о таблице
        await this.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
            fields: 'sheets.properties.title'
        }).then((response) => {
            const sheets = response.result.sheets;
            const sheetExists = sheets.some(sheet => sheet.properties.title === title);

            if (sheetExists) {
                console.log(`Лист с названием "${title}" уже существует.`);
                return;
            }

            // Если листа нет, создаем его
            this.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: title
                            }
                        }
                    }
                ]
            }).then((response) => {
                console.log('Лист добавлен:', response.result.replies[0].addSheet.properties.sheetId);
                this.addColumns(['code','value']);
            }).catch((error) => {
                console.error('Ошибка при добавлении листа:', error);
            });
        }).catch((error) => {
            console.error('Ошибка при получении информации о таблице:', error);
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
        let range = this.list + '!' + 'A' + row + ':Z' + row;
        let spreadsheetId = this.spreadsheetId;
        return await this.api.fetchSheetValues({range, spreadsheetId});
    }

    async getAll(options={}) {
        let {caching, formated} = options;
        const range = this.list + '!A1:B1000';
        let spreadsheetId = this.spreadsheetId;
        let response = await this.api.fetchSheetValues({range, spreadsheetId, caching});
        this.columns[this.list] =response[0];
        this.setCodes(response);
        if (formated){
            return this.formatData(response);
        }
        return response;
    }

    async getColumns(list) {
        if (this.columns[list]) return;
        const range = (list ? list + '!' : '') + 'A1:Z1';
        let spreadsheetId = this.spreadsheetId
        const values = await this.api.fetchSheetValues({range, spreadsheetId});
        if (values.length > 0) {
            this.columns[list] = values[0];
        }
    }

    setCodes(response) {
        response.forEach((e, i) => {
            this.codes[e[0]] = i
        });
    }

    formatData(response) {
        let result = {};
        response.forEach((e, i) => {
            result[e[0]] = e[1]
        });
        return result;
    }
}

export class GoogleSheetDB {
    constructor(options={}) {
        this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

        this.apiKey = API_KEY;
        this.tokenClient = {};
        this.gapiInited = false;
        this.gisInited = false;

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
            if (this.expired()) {
                console.log('нужно авторизоваться');
                clearInterval(timer);
            }
        })
        window.GoogleSheetDB = this;
    }

    async waitGoogle(timeout = 10000) {
        const startTime = Date.now();
        while (!(this.gapiInited && this.gisInited)) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Инициализация Google API не завершена в течение отведенного времени.'
                    + this.gapiInited + ' ' + this.gisInited);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    expired(){
        return localStorage.getItem('gapi_token_expires') - this.getTime() < 10
    }
    getTime(){
        return Math.floor(Date.now() / 1000)
    }

    async gapiLoaded(){
        gapi.load('client', this.initializeGapiClient.bind(this));
    }


    maybeEnableButtons() {
        if (this.gapiInited && this.gisInited) {
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

        this.gapiInited = true;
        if (this.callback) this.callback();

        this.maybeEnableButtons();
    }

    gisLoaded() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => {}, // пустой, определим в handleAuthClick
        });
        this.gisInited = true;
        this.maybeEnableButtons();
        this.eventHandler();
    }

    eventHandler() {
        document.getElementById('authorize_button').onclick = this.handleAuthClick.bind(this);

        document.getElementById('signout_button').onclick = this.handleSignoutClick.bind(this);
    }

    handleAuthClick(callback) {
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

            callback();
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

    async fetchSheetValues(options) {
        let {range, spreadsheetId, caching} = options;
        let response;
        let data = [];
        let storageKey = range + spreadsheetId;
        let storageData = sessionStorage.getItem(storageKey);
        if (caching && storageData){
            return JSON.parse(storageData);
        }
        try {
            response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: range,
            });
        } catch (err) {
            console.error(err.message);
            return data;
        }
        const result = response.result;
        if (!result || !result.values || result.values.length === 0) {
            console.error('No values found.');
            return data;
        }
        data = result.values;
        sessionStorage.setItem(storageKey, JSON.stringify(data));
        return data;
    }
}

function loadScriptOnce({ src, onload, async = true, defer = true }) {
    // Проверяем, не загружен ли уже скрипт
    const existingScript = Array.from(document.getElementsByTagName('script'))
        .find(script => script.src === src);

    if (existingScript) {
        console.log(`Скрипт уже загружен: ${src}`);
        onload();
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


