db = db.getSiblingDB("book-convert-to-strongly-typed");
db.dropDatabase();

// Insert orders documents
db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "order_date": "2020-05-30T08:35:52",
    "value": "231.43",
    "further_info": {
      "item_qty": "3",
      "reported": "false",
    },
  },
  {
    "customer_id": "oranieri@warmmail.com",
    "order_date": "2020-01-01T08:25:37",
    "value": "63.13",
    "further_info": {
      "item_qty": "2",
    },
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "order_date": "2019-05-28T19:13:32",
    "value": "2.01",
    "further_info": {
      "item_qty": "1",
      "reported": "true",
    },
  },  
]);

// Define the pipeline
var pipeline = [
  // Convert strings to required types
  {"$set": {
    "order_date": {"$toDate": "$order_date"},    
    "value": {"$toDecimal": "$value"},
    "further_info.item_qty": {"$toInt": "$further_info.item_qty"},
    "further_info.reported": {"$switch": {
      "branches": [
        {"case": 
          {"$eq": [{"$toLower": "$further_info.reported"}, "true"]}, 
          "then": true
        },
        {"case": 
          {"$eq": [{"$toLower": "$further_info.reported"}, "false"]}, 
          "then": false
        },
      ],
      "default": 
        {"$ifNull": ["$further_info.reported", "$$REMOVE"]},
    }},     
  }},     
  
  // Output to an unsharded or sharded collection
  {"$merge": {
    "into": "orders_typed",
  }},    
];

// Execute the aggregation and print the result
db.orders.aggregate(pipeline);
var result = db.orders_typed.find();
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output
