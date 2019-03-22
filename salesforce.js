var nforce = require('nforce');
var http = require('http');
var request 		= require('request');
var config = require('./config');
var oauth;
var oauthJSONString = '';
var quoteId;
var cartId;
var org;
var instanceURL="https://na40.salesforce.com";
var AzureURL = 'http://metadataapttusmax.azurewebsites.net/SFServiceCall.svc';
var AzureURLPOST='https://apttusgenericapisdotnet.azurewebsites.net/api/CLM/';


org = nforce.createConnection({
    clientId: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    redirectUri: config.CALLBACK_URI,
    autoRefresh: true,
    apiVersion: 'v36.0',  		// optional, defaults to current salesforce API version
    environment: 'production',  	// optional, salesforce 'sandbox' or 'production', production default
    mode: 'single' 				// optional, 'single' or 'multi' user mode, multi default
});
org.authenticate({ username: config.SF_UNAME, password: config.SF_PWD }, function (err, resp) {	
    if (!err) {
        oauth = resp;
        var response = resp.id;
        response=response.split('/')[5];
        oauth = org.oauth;		
            console.log("Token ",oauth);					
        var isLoggedIn = true;
        //resolve(response);                
    } else {
        console.log('Error: ' + err.message);
        var isLoggedIn = false;
        //reject(isLoggedIn);                
    }
});

function CreateAccount (name){
        var account = nforce.createSObject('Account');
        console.log("Name :"+name);
        account.set('Name',name);
        return new Promise(function (resolve, reject) {
            org.insert({ sobject: account, oauth: oauth }, function (err, resp) {
                console.log(err);
                console.log(resp);
                if (!err) {
                    resolve(resp.id);
                } else {
                    reject(err);
                }
            });
        });
}
function querySObject(query) {	
	return new Promise(function (resolve, reject) {		
		org.query({ query: query, oauth: oauth }, function (err, res) {
			if (!err) 
				resolve(res.records);								
			else 
				reject(err);								
		});
	});
}
function getDescribe(objectName) {	
    return new Promise(function (resolve, reject) {
        org.getDescribe({ type: objectName, oauth: oauth }, function(err, res) {
            if (!err) 
				resolve(res);								
			else 
				reject(err);	
        });
    });
}

function createLead(leadInfo){
    var lead = nforce.createSObject('Lead');
    lead.set("FirstName","Mehul");
    lead.set("LastName","Parmar");
    lead.set("Email", leadInfo.email);
    lead.set("Company", leadInfo.Company);
    lead.set("Phone", leadInfo.phone);
    lead.set("Industry", leadInfo.industry);
    lead.set("LeadSource", lead.leadSource);
    lead.set("Street", leadInfo.street);
    lead.set("City", leadInfo.city);
    lead.set("State", leadInfo.state);
    lead.set("PostalCode",leadInfo.zipCode);
    lead.set("Country",leadInfo.country);
    lead.set("Rating","Green")
    lead.set("Description","Customer needs "+leadInfo.quantity+ " of "+leadInfo.product);

    return new Promise(function (resolve, reject) {
        org.insert({ sobject: lead, oauth: oauth }, function (err, resp) {
            console.log(err);
            console.log(resp);
            if (!err) {
                resolve(resp.id);
            } else {
                reject(err);
            }
        });
    });

}

function saveAddress(message){
    var userInfo = nforce.createSObject('User_Information__c');
    lead.set("Name",message.user.name);
    lead.set("Address__c ",message.address);

    return new Promise(function (resolve, reject) {
        org.insert({ sobject: userInfo, oauth: oauth }, function (err, resp) {
            console.log(err);
            console.log(resp);
            if (!err) {
                resolve(resp.id);
            } else {
                reject(err);
            }
        });
    });

}

exports.org = org;
exports.oauth = oauth;
exports.CreateAccount = CreateAccount;
exports.querySObject = querySObject;
exports.getDescribe = getDescribe;
exports.createLead = createLead;
exports.saveAddress = saveAddress;


