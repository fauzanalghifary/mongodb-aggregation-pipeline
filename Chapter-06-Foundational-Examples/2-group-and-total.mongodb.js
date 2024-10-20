db = db.getSiblingDB("book-group-and-total");
db.dropDatabase();

// Create index for an orders collection
db.orders.createIndex({"orderdate": -1});

// Insert records into the orders collection
db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-05-30T08:35:52Z"),
    "value": NumberDecimal("231.43"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-01-13T09:32:07Z"),
    "value": NumberDecimal("99.99"),
  },
  {
    "customer_id": "oranieri@warmmail.com",
    "orderdate": ISODate("2020-01-01T08:25:37Z"),
    "value": NumberDecimal("63.13"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2019-05-28T19:13:32Z"),
    "value": NumberDecimal("2.01"),
  },  
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2020-11-23T22:56:53Z"),
    "value": NumberDecimal("187.99"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2020-08-18T23:04:48Z"),
    "value": NumberDecimal("4.59"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-12-26T08:55:46Z"),
    "value": NumberDecimal("48.50"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2021-02-29T07:49:32Z"),
    "value": NumberDecimal("1024.89"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-10-03T13:49:44Z"),
    "value": NumberDecimal("102.24"),
  },
]);


// Define the pipeline
var pipeline = [
  // Match only orders made in 2020
  {"$match": {
    "orderdate": {
      "$gte": ISODate("2020-01-01T00:00:00Z"),
      "$lt": ISODate("2021-01-01T00:00:00Z"),
    },
  }},
  
  // Sort by order date ascending (to pick out 'first_purchase_date' below)
  {"$sort": {
    "orderdate": 1,
  }},      

  // Group by customer
  {"$group": {
    "_id": "$customer_id",
    "first_purchase_date": {"$first": "$orderdate"},
    "total_value": {"$sum": "$value"},
    "total_orders": {"$sum": 1},
    "orders": {"$push": {"orderdate": "$orderdate", "value": "$value"}},
  }},
  
  // Sort by each customer's first purchase date
  {"$sort": {
    "first_purchase_date": 1,
  }},    
  
  // Set customer's ID to be value of the field that was grouped on
  {"$set": {
    "customer_id": "$_id",
  }},
  
  // Omit unwanted fields
  {"$unset": [
    "_id",
  ]},   
];


// Execute the aggregation and print the result
var result = db.orders.aggregate(pipeline);
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output

