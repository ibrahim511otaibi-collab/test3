function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return ContentService.createTextOutput("No data");

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'sendSMS') {
      return sendKwtSMS(data.numbers, data.message);
    }

    if (data.action === 'uploadFileOnly') {
      var folders = DriveApp.getFoldersByName("TaskAttachments");
      var folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("TaskAttachments");
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }

      var base64 = data.fileBase64.split(',')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(base64), data.mimeType, data.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: file.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function sendKwtSMS(numbersArray, messageText) {
  var url = "https://www.kwtsms.com/API/send/?username=alturath&password=nPjKfNvZQjQ97E@&sender=TrathFrwnya&mobile=" + numbersArray.join(',') + "&message=" + encodeURIComponent(messageText) + "&lang=3&test=0";

  var options = {
    "method": "get",
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("SMS Response: " + response.getContentText());
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      response: response.getContentText()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log("SMS API Error: " + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "SMS API Error: " + e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function dailySMSReminder() {
  // Fetch from Firebase REST API
  var url = "https://firestore.googleapis.com/v1/projects/taskmanager-8b075/databases/(default)/documents/tasks";
  var options = {
    "method": "get",
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log("Failed to fetch tasks: " + response.getContentText());
    return;
  }

  var data = JSON.parse(response.getContentText());
  if (!data.documents) return;

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowStr = tomorrow.getFullYear() + "-" +
    String(tomorrow.getMonth() + 1).padStart(2, '0') + "-" +
    String(tomorrow.getDate()).padStart(2, '0');

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + "-" +
    String(yesterday.getMonth() + 1).padStart(2, '0') + "-" +
    String(yesterday.getDate()).padStart(2, '0');

  for (var i = 0; i < data.documents.length; i++) {
    var doc = data.documents[i];
    var fields = doc.fields;

    var status = fields.taskStatus ? fields.taskStatus.stringValue : "";
    if (status === "مغلق ومُقيم" || status === "ملغي" || status === "جاهز للمراجعة") continue;

    var dueDate = fields.dueDate ? fields.dueDate.stringValue : "";
    if (!dueDate) continue;

    var empPhone = fields.employeePhone ? fields.employeePhone.stringValue : "";
    var details = fields.taskDetails ? fields.taskDetails.stringValue : "";
    var title = "تكليف عمل";
    if (details) {
      title = details.split('\n')[0].replace('العنوان: ', '');
    }

    if (empPhone) {
      var message = "";
      if (dueDate === tomorrowStr) {
        message = "تذكير: التكليف [" + title + "] يجب تسليمه غداً. يرجى إنجازه لتجنب الخصم من التقييم.";
      } else if (dueDate === yesterdayStr) {
        message = "تنبيه: التكليف [" + title + "] انتهت مدة تسليمه البارحة. يرجى إنجازه فوراً لتجنب الخصم.";
      }

      if (message !== "") {
        var smsUrl = "https://www.kwtsms.com/API/send/?username=alturath&password=nPjKfNvZQjQ97E@&sender=TrathFrwnya&mobile=" + empPhone + "&message=" + encodeURIComponent(message) + "&lang=3&test=0";

        UrlFetchApp.fetch(smsUrl, {
          "method": "get",
          "muteHttpExceptions": true
        });
        Logger.log("Sent reminder/alert to " + empPhone + " for task: " + title);
      }
    }
  }
}
