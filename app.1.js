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

var model = process.env.model || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/fdec391e-4ff3-4344-a330-5cc707773c73?verbose=true&timezoneOffset=-360&subscription-key=2799c9a4130d4c67bdaf1fd824ed2ec1'
var recognizer = new builder.LuisRecognizer(model);


var intents = new builder.IntentDialog({ recognizers: [recognizer] });

var allFields = [];
server.post('/api/messages', connector.listen());

const supportedIntents = {
    CreateAccount : 'CreateAccount',
    CreateContact : 'CreateContact',
    GetAccountDescribe :'GetAccountDescribe',
    GetAccountFieldsValue :'GetAccountFieldsValue'
}


//=========================================================
// Bots Dialogs
//=========================================================
bot.dialog('/', intents);


intents.matches(supportedIntents.CreateAccount,supportedIntents.CreateAccount);

bot.dialog('CreateAccount', [
    function (session,args,next){
        
        session.userData.accountData = {};
        session.userData.accountData.Id = '';
        session.userData.accountData.Name = '';
        let AccountDetails = builder.EntityRecognizer.findEntity(args.entities, 'AccountName');
        if(AccountDetails!=null){
            AccountDetails = AccountDetails.entity;
            next({response : AccountDetails});
        }
        else{
            builder.Prompts.text(session,'What would you like to name it?');
        }
       
        // salesforce.CreateAccount(AccountDetails)
        // .then(
        //     function (successData) {
        //        session.userData.accountData.Id = successData;
        //        session.userData.accountData.Name = AccountDetails;
        //       next();
        //     },
        //     function(error){

        //     }    
        // );
    },
    function(session,results,next){
        if(results.response != ''){
            session.userData.accountData.accountName = results.response;
        }
        next();
    },
    function(session,args,next){
        builder.Prompts.confirm(session,'Would you like to capture other fields?');
    },
    function(session,results,next){
        console.log(results.response);
        if(results.response){
            session.replaceDialog(supportedIntents.GetAccountDescribe);
        }
        else{
            session.endConversation("Ok well go sell some more, you’ve almost made your quota!");  
        }
       
    },
    // function (session,args,next){
    //     var query = "Select Id, Name from account Where id = '" + session.userData.accountData.Id + "' limit 10";
    //     console.log(query);
    //     var accountPromise = salesforce.querySObject(query);
    //     accountPromise.then(
    //         function (successData) {
    //         console.log(successData);
    //             if(successData.length<0){
    //                 session.send("Sorry I couldn’t find that account, do you want to try a different account?");					  
    //             }
    //             else{
    //             	builder.Prompts.confirm(session, "Would you like to create contacts for the account?");
    //                 session.send(showAccountCard(session));
	// 	        }					
                                
    //         }, function (error) {				   
    //         }
    //     )
    // }
]);

bot.dialog('GetAccountDescribe', [
    function (session,args,next){
    var describeResults = salesforce.getDescribe('Account')
        .then(
            function (successData) {
                
                allFields = successData.fields;
                session.replaceDialog(supportedIntents.GetAccountFieldsValue);
            },
            function(error){

            }    
        );
    }
]);
bot.dialog('GetAccountFieldsValue', [
    function (session,args,next){
        builder.Prompts.text(session,'Which field would you like to capture?');
    },
    function(session,results,next){
        let fieldName = results.response;
        let fieldDetails  = verifyField(session,fieldName,allFields);
        if(fieldDetails == null){

        }
        else{
            console.log(JSON.stringify(fieldDetails));
        }
    }
]);

function verifyField(session,fieldName,allFields){
    var jsonValue = JSON.stringify(allFields);
    let fieldDetail = null;
    for(var i=0;i<allFields.length;i++){	    
        let field = allFields[i];
        if(field.Name == fieldName && !field.calculated){
            fieldDetail = field;
        }		
    }
    return fieldDetail;
}
function showAccountCard(session){
    
    session.sendTyping();
    
	var accountURL = config.INSTANCE_URL+session.userData.accountId;
	
            //session.dialogData.agreement.allClausesFinal = true;
            var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("Account")
                    .subtitle(session.userData.accountData.Name)
                    .images([
                        builder.CardImage.create(session, "https://i1.wp.com/www.warrenctlibrary.org/wp-content/uploads/2018/05/account-icon-lg.png")
                    ])
                    .tap(builder.CardAction.openUrl(session, accountURL))
                    .buttons([
                        builder.CardAction.openUrl(session, accountURL, "View in Salesforce")
                    ])
            ]);
        
    return msg; 
}


