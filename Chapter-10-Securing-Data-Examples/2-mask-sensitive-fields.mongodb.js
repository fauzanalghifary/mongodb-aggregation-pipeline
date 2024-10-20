db = db.getSiblingDB("book-mask-sensitive-fields");
db.dropDatabase();

// Insert records into the payments collection
db.payments.insertMany([
  {
    "card_name": "Mrs. Jane A. Doe",
    "card_num": "1234567890123456",
    "card_expiry": ISODate("2023-08-31T23:59:59Z"),
    "card_sec_code": "123",
    "card_type": "CREDIT",        
    "transaction_id": "eb1bd77836e8713656d9bf2debba8900",
    "transaction_date": ISODate("2021-01-13T09:32:07Z"),
    "transaction_amount": NumberDecimal("501.98"),
    "reported": false,
    "customer_info": {
      "category": "RESTRICTED",
      "rating": 89,
      "risk": 3,
    },
  },
  {
    "card_name": "Jim Smith",
    "card_num": "9876543210987654",
    "card_expiry": ISODate("2022-12-31T23:59:59Z"),
    "card_sec_code": "987",
    "card_type": "DEBIT",        
    "transaction_id": "634c416a6fbcf060bb0ba90c4ad94f60",
    "transaction_date": ISODate("2020-11-24T19:25:57Z"),
    "transaction_amount": NumberDecimal("64.01"),
    "reported": true,
    "customer_info": {
      "category": "NORMAL",
      "rating": 78,
      "risk": 55,
    },
  },
]);

// Define the pipeline
var pipeline = [
  // Replace a subset of fields with new values
  {"$set": {
    // Extract last word from the name , eg: 'Doe' from 'Mrs. Jane A. Doe'
    "card_name": {"$regexFind": {"input": "$card_name", "regex": /(\S+)$/}},
          
    // Mask card num 1st part retaining last 4 chars,
    // eg: '1234567890123456' -> 'XXXXXXXXXXXX3456'
    "card_num": {"$concat": [
                  "XXXXXXXXXXXX",
                  {"$substrCP": ["$card_num", 12, 4]},
                ]},                     

    // Add/subtract random time amount of max 30 days (~1 month) each-way
    "card_expiry": {"$add": [
                     "$card_expiry",
                     {"$floor": {
                      "$multiply": [
                        {"$subtract": [{"$rand": {}}, 0.5]},
                        2*30*24*60*60*1000
                      ]
                    }},
                   ]},                     

    // Replace each digit with random digit, eg: '133' -> '472'
    "card_sec_code": {"$concat": [
                       {"$toString": {
                        "$floor": {"$multiply": [{"$rand": {}}, 10]}}
                      },
                       {"$toString": {
                        "$floor": {"$multiply": [{"$rand": {}}, 10]}}
                      },
                       {"$toString": {
                        "$floor": {"$multiply": [{"$rand": {}}, 10]}}
                      },
                     ]},
                     
    // Add/subtract random percent of amount's value up to 10% max each-way
    "transaction_amount": {"$add": [
                            "$transaction_amount",
                            {"$multiply": [
                              {"$subtract": [{"$rand": {}}, 0.5]},
                              0.2,
                              "$transaction_amount"
                            ]},
                          ]},
                          
    // Retain field's bool value 80% of time on average, setting to the
    // opposite value 20% of time
    "reported": {"$cond": {
                   "if":   {"$lte": [{"$rand": {}}, 0.8]},
                   "then": "$reported",
                   "else": {"$not": ["$reported"]},
                }},      

    // Exclude sub-doc if sub-doc's category field's value is 'RESTRICTED'
    "customer_info": {"$cond": {
                        "if": {
                          "$eq": ["$customer_info.category", "RESTRICTED"]
                        }, 
                        "then": "$$REMOVE",     
                        "else": "$customer_info",
                     }},                                         
                
    // Mark _id field to excluded from results
    "_id": "$$REMOVE",                
  }},
  
  // Take regex matched last word from the card name
  // and prefix it with hardcoded value
  {"$set": {
    "card_name": {"$concat": [
      "Mx. Xxx ",
      {"$ifNull": ["$card_name.match", "Anonymous"]}
    ]},
  }},
];

// Execute the aggregation and print the result
var result = db.payments.aggregate(pipeline);
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output

