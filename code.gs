function updateSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Example update operation: Add "Updated" text in cell A1
  sheet.getRange("C1").setValue("Updated");
}

const apiToken = 'your_api_token';

function updateSheet2() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Set the headers in the sheet
  sheet.getRange("A1").setValue("Group Name");
  sheet.getRange("B1").setValue("Group ID");
  
  // Define the URL and headers for the WHAPI request
  var url = "https://gate.whapi.cloud/groups?count=500";
  var options = {
    "method": "GET",
    "headers": {
      "accept": "application/json",
      "authorization": apiToken
    }
  };
  
  // Make the HTTP request to the WHAPI
  var response = UrlFetchApp.fetch(url, options);
  
  // Check if the response is successful
  if (response.getResponseCode() == 200) {
    var responseData = JSON.parse(response.getContentText());
    var groups = responseData.groups;
    
    // Start writing the group details to the sheet starting from row 2
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var groupId = group.id;
      var groupName = group.name;
      
      // Write the group name and group ID to the respective cells
      sheet.getRange(i + 2, 1).setValue(groupName); // Column A for group name
      sheet.getRange(i + 2, 2).setValue(groupId);   // Column B for group ID
    }
  } else {
    Logger.log("Failed to fetch groups: " + response.getResponseCode() + " - " + response.getContentText());
  }
}

function getFilledRowsCount() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var numRows = sheet.getLastRow();
  var filledRows = 0;
  
  for (var row = 2; row <= numRows; row++) { // Assuming row 1 is the header
    var mobileNumber = sheet.getRange(row, 3).getValue(); // Column C for Mobile
    var messageID = sheet.getRange(row, 13).getValue(); // Column I for Final Message
    
    if (mobileNumber && messageID && messageID !== '') {
      filledRows++;
    }
  }
  Logger.log(`filled rows = ${filledRows}`);
  return filledRows;
}

function updateMessageDetails(row, sentTime, messageStatus, messageID=undefined) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(row, 11).setValue(convertTimestampToUTC530(sentTime)); // Assuming column K is the confirmation column
  sheet.getRange(row, 12).setValue(messageStatus);
  if (!!messageID) {
    sheet.getRange(row, 13).setValue(messageID);
  }
}

/**
 * Function to get message status by message ID
 * 
 * @param messageID
 * 
 * @returns messageStatus
 */
function getMessageStatus(messageID) {
  try{
    var url = `https://gate.whapi.cloud/messages/${messageID}`;
    
    var options = {
      "method": "get",
      "contentType": "application/json",
      "headers": {
        "Authorization": apiToken,
        "accept": "application/json"
      }
    };

    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());

    return responseData.status ? responseData.status : undefined;
  }
  catch (err) {
    Logger.log(`Couldn't get message status. Error : ${err}`);
    return undefined;
  }
}

/**
 * Function to update Column 12 (L) to status of message (read, delivered)
 */
function updateReadReceipts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var numRows = sheet.getLastRow();
  var messageStatus = undefined;

  for (var row = 2; row < numRows + 2; row++) { // Assuming row 1 is the header
  try{
    const messageID = sheet.getRange(row, 13).getValue(); // Column L for message ID
    if (!!messageID && messageID !== '') {
      messageStatus = undefined;
      // if (mobileNumber && finalMessage) {
      messageStatus = getMessageStatus(messageID);
      sheet.getRange(row, 12).setValue(messageStatus ? messageStatus : '');
      // }else{
      //   Logger.log("Skipped sending message: Empty mobile number or message.");
      // }
    }
  }
  catch (err) {
    Logger.log(`Update read reciepts error for row : ${row} : ${err}`)
  }

  }
}

function sendWhatsAppMessage(mobileNumber, message, rowNumber) {
  try{
    var url = "https://gate.whapi.cloud/messages/text";
    
    var payload = {
      "typing_time": 0,
      "to": mobileNumber,
      "body": message
    };
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "headers": {
        "Authorization": apiToken,
        "accept": "application/json"
      },
      "payload": JSON.stringify(payload)
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());

    // Log the response data
    Logger.log(responseData.sent);

    // Check if the response contains the sent_at timestamp
    if (responseData.sent) {
      var sentTime = responseData.message ? responseData.message.timestamp : undefined;
      if (!!sentTime) {
        updateMessageDetails(rowNumber, sentTime, "sent", responseData.message.id);
      }
      else {
        Logger.log("No timestamp found in the response.")
      }
    }else{
      Logger.log("No sent_at timestamp found in the response.");
    }
  }catch(error){
    Logger.log("Skipped sending message: Empty mobile number or message.");
  }
}

function sendAllMessages() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var numRows = sheet.getLastRow();
  
  for (var row = 2; row <= numRows; row++) { // Assuming row 1 is the header
    var mobileNumber = sheet.getRange(row, 3).getValue(); // Column C for Mobile
    var finalMessage = sheet.getRange(row, 9).getValue(); // Column I for Final Message
    
    // // Send message only if mobile number and final message are not empty
    // if (mobileNumber && finalMessage) {
    sendWhatsAppMessage(mobileNumber, finalMessage, row);
    // }else{
    //   Logger.log("Skipped sending message: Empty mobile number or message.");
    // }
  }
}

function sendYesSwitch() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var numRows = sheet.getLastRow();

  for (var row = 2; row <= numRows; row++) { // Assuming row 1 is the header
    var switchKey = sheet.getRange(row, 10).getValue(); // Column I for Switch Key
    var mobileNumber = sheet.getRange(row, 3).getValue(); // Column C for Mobile
    var finalMessage = sheet.getRange(row, 9).getValue(); // Column I for Final Message
    
    // Send message only if Switch Key is "Yes" and mobile number and final message are not empty
    if (switchKey && switchKey.toLowerCase() === "yes") {
      sendWhatsAppMessage(mobileNumber, finalMessage, row);
    } else {
      Logger.log("Skipped sending message: Switch Key is not 'Yes' or empty mobile number or message.");
    }
  }
}

function convertTimestampToUTC530(timestamp) {
    // Create a Date object from the timestamp
    const date = new Date((timestamp * 1000));

    // Get the UTC time in milliseconds
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;

    // Offset for UTC+5:30 in milliseconds
    const offset = 5.5 * 60 * 60 * 1000;

    // Create a new Date object with the offset applied
    const utc530Date = new Date(utcTime + offset);
    Logger.log(utc530Date);

    return utc530Date.toString();
}




















