require("dotenv").config();

const express = require("express");
const AWS = require("aws-sdk");

const port = 3003;
const app = express();

// Set the region
AWS.config.update({ region: "eu-west-1" });

// Create an SQS service object
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

const queueURL =
  process.env.SQS_URL ||
  "https://sqs.eu-west-1.amazonaws.com/123****/queue-name-***";

const params = {
  AttributeNames: ["SentTimestamp"],
  MaxNumberOfMessages: 1,
  MessageAttributeNames: ["All"],
  QueueUrl: queueURL,
  WaitTimeSeconds: 20
};

const checkForMessages = () => {
  // get next message from the queue
  sqs.receiveMessage(params, function(err, data) {
    if (err) {
      console.log("Error", err);
      return;
    }

    console.log(JSON.stringify(data, null, 2));

    // check if there is a message
    if (typeof data.Messages === "undefined") {
      console.log("No more messages");
      checkForMessages();
      return;
    }

    // delete processed message from the queue
    const deleteParams = {
      QueueUrl: queueURL,
      ReceiptHandle: data.Messages[0].ReceiptHandle
    };
    sqs.deleteMessage(deleteParams, function(err, data) {
      if (err) {
        console.log("Delete Error", err);
      } else {
        console.log("Message Deleted", data);
      }
    });

    checkForMessages();
  });
};

checkForMessages();

const randomText = () => {
  return Math.random()
    .toString(36)
    .substring(7);
};

app.get("*", (req, res) => {
  const params = {
    DelaySeconds: 0,
    MessageAttributes: {
      Title: {
        DataType: "String",
        StringValue: randomText()
      }
    },
    MessageBody: "Message: " + randomText(),
    QueueUrl: queueURL
  };

  // add a message to the queue
  sqs.sendMessage(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.MessageId);
    }
  });

  res.json(params);
});

app.listen(port, function() {
  console.log("App is listening on port: " + port);
});
