var builder = require('botbuilder');
var restify = require('restify');
var salesforce = require('./salesforce');
var config = require('./config');
var azure = require('botbuilder-azure');
var locationDialog = require('botbuilder-location');
var provinces = require('./provinces.json');
var validator = require("email-validator");
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

bot.on('contactRelationUpdate', function (message) {
    let session = {};

    //userLog(message, "contactRelationUpdate");
    //console.log("==>>> contactRelationUpdate" + JSON.stringify(message.user));
    if (message.action === 'add') {
        var addAddressPromise = salesforce.saveAddress(message);
        addAddressPromise.then(
            function(successdata){
                var name = message.user ? message.user.name : null;
                var reply = new builder.Message()
                    .address(message.address)
                    .text("Hello %s... Welcome to the world of Dell, How can i halp you ?", name);
                bot.send(reply);
            },
            function(error){

            }
            
        )
        
    } else {
    }
});

var docDbClient = new azure.DocumentDbClient(documentDbOptions);

var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

var bot = new builder.UniversalBot(connector);

var model = process.env.model || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/cece62ec-dfba-4e85-ae66-65e792c79df5?verbose=true&timezoneOffset=-360&subscription-key=2799c9a4130d4c67bdaf1fd824ed2ec1';
var recognizer = new builder.LuisRecognizer(model);


var intents = new builder.IntentDialog({ recognizers: [recognizer] });

var allFields = [];
server.post('/api/messages', connector.listen());

const supportedIntents = {
    CreateLead : 'CreateLead'
}


//=========================================================
// Bots Dialogs
//=========================================================
bot.dialog('/', intents);
bot.library(locationDialog.createLibrary('AoD8C6IEWze1b7kin8eVHpCk34jxsOdlTxMcZsd2PpavNEb1kaXgg9wAvPjQZYCP'));

intents.matches(supportedIntents.CreateLead,supportedIntents.CreateLead);

bot.dialog('CreateLead',[
    function(session,args,next){
        session.userData.leadInfo = {};
        let companyName = builder.EntityRecognizer.findEntity(args.entities, 'Company Name');
        if(companyName!=null){
            session.userData.leadInfo.Company = companyName.entity;
        }
        let product = builder.EntityRecognizer.findEntity(args.entities, 'Product');
        if(product!=null){
            session.userData.leadInfo.product = product.entity;
        }
        let quantity = builder.EntityRecognizer.findEntity(args.entities, 'Quantity');
        if(quantity!=null){
            session.userData.leadInfo.quantity = parseInt(quantity.entity);
        }

        if(session.userData.leadInfo.Company != null && session.userData.leadInfo.Company!=''){
            next({response:session.userData.leadInfo.Company})
        }
        else{
            builder.Prompts.text(session,'Great, May I know the name of your firm name?');
        }
    },
    function(session,results,next){
        session.userData.leadInfo.companyName = results.response;
        
        builder.Prompts.text(session, "How about an email?");
        
    },
    function(session,results,next){
       // session.userData.leadInfo.email = results.response;
        let email = results.response;

        
        if(validator.validate(email)){
            session.userData.leadInfo.email = email;
            builder.Prompts.number(session, "Thanks. I’ll also need a phone number");
        }else{
            session.send("Please provide a valid email id");
            next({ resumed: builder.ResumeReason.back,response:session.userData.leadInfo.companyName});	
        }
        
    },
    function(session,results,next){
        session.userData.leadInfo.phone = results.response;
        let options = {
            prompt: "Where are you located?",
            //useNativeControl: true,
            reverseGeocode: true,
            skipConfirmationAsk: true,
            skipFavorites: true,
            requiredFields: locationDialog.LocationRequiredFields.streetAddress |
                locationDialog.LocationRequiredFields.locality |
                locationDialog.LocationRequiredFields.region |
                locationDialog.LocationRequiredFields.postalCode |
                locationDialog.LocationRequiredFields.country
        };

        locationDialog.getLocation(session, options);

    },
    function(session,results,next){
        let place = results.response;
        session.userData.leadInfo.street = place.streetAddress;
        session.userData.leadInfo.city = place.locality;
        for (var i = 0; i < provinces.length; i++) {
            if (provinces[i].short == place.region) {
                session.userData.leadInfo.state = provinces[i].name;
                break;
            }
        }
        session.userData.leadInfo.zipCode = place.postalCode;
        session.userData.leadInfo.country = place.country;

        let industry = [];
        industry.push('Agriculture');
        industry.push('Apparel');
        industry.push('Banking');
        industry.push('Biotechnology');
        industry.push('Chemicals');
        industry.push('Communications');
        industry.push('Construction');
        industry.push('Consulting');
        industry.push('Education');
        industry.push('Electronics');
        industry.push('Energy');
        industry.push('Engineering');
        industry.push('Entertainment');
        industry.push('Environmental');
        industry.push('Finance');
        industry.push('Food & Beverage');
        industry.push('Government');
        industry.push('Healthcare');
        industry.push('Hospitality');
        industry.push('Insurance');
        industry.push('Machinery');
        industry.push('Manufacturing');
        industry.push('Media');
        industry.push('Not For Profit');
        industry.push('Other');
        industry.push('Recreation');
        industry.push('Retail');
        industry.push('Shipping');
        industry.push('Technology');
        industry.push('Telecommunications');
        industry.push('Transportation');
        industry.push('Utilities');

        builder.Prompts.choice(session, "Which industry are you from:", industry, {
            retryPrompt: 'Oops, that is not in the list, please select from the list'
        });
    },
    function(session,results,next){
        session.userData.leadInfo.industry = results.response.entity;

        let leadSource = [];
        leadSource.push('Web');
        leadSource.push('Phone Inquiry');
        leadSource.push('Partner Referral');
        leadSource.push('Purchased List');
        leadSource.push('Other');

        builder.Prompts.choice(session, "From where did you get to know about us? ", leadSource, {
            retryPrompt: 'Oops, that is not in the list, please select from the list'
        });
    },
    function(session,results,next){
        session.userData.leadInfo.leadSource = results.response.entity;
        session.sendTyping();
        var createLead = salesforce.createLead(session.userData.leadInfo);

        createLead.then(
            function(successdata){
                session.endConversation('Thank you, We have received your data, our sales person will contact you shortly...');
            },
            function(error){
                console.log(error);
            }
        )
        
    }

]);