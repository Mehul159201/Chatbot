var builder = require('botbuilder');
var restify = require('restify');
var salesforce = require('./salesforce');
var config = require('./config');
var azure = require('botbuilder-azure');
//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
}); 

// Create chat bot
var connector = new builder.ChatConnector({
    callbackUrl: 'https://chatbotsazure.azurewebsites.net/api/calls',
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_PASSWORD
});

var documentDbOptions = {
    host: 'https://apttusmax-cosmos-se.documents.azure.com:443/',
    masterKey: 'CqXYTGgpPHWj2Yy1rWOKe9awOcBUErOV5MES4lCPgFC5Ac7VsxsDs94S8oWi31xuL4W0xGEZ0BI4hT0RiH5BVA==',
    database: 'botdocs-max-mtc-sf',
    collection: 'botdata-max-mtc-sf'
};

var docDbClient = new azure.DocumentDbClient(documentDbOptions);

var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

var bot = new builder.UniversalBot(connector);

var model = process.env.model || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/020ac1d6-1cab-4017-9f71-e8086e28f0f8?verbose=true&timezoneOffset=-360&subscription-key=2799c9a4130d4c67bdaf1fd824ed2ec1';
var recognizer = new builder.LuisRecognizer(model);


var intents = new builder.IntentDialog({ recognizers: [recognizer] });

var allFields = [];
server.post('/api/messages', connector.listen());

const supportedIntents = {
    CreateUser : 'CreateUser',
    GetAccountDescribe : 'GetAccountDescribe',
    getUserFields : 'getUserFields'
}


//=========================================================
// Bots Dialogs
//=========================================================
bot.dialog('/', intents);


// 

