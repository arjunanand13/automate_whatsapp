function updateSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Example update operation: Add "Updated" text in cell A1
  sheet.getRange("C1").setValue("Updated");
}

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
      "authorization": "Bearer NDSOWja0K5vkQmjNwPvD08m0PvoPLi1D"
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
