db = db.getSiblingDB("book-state-change-boundaries");
db.dropDatabase();

// Use a time-series collection for optimal processing
// NOTE: This command can be commented out & this example will still work
db.createCollection("device_status", {
  "timeseries": {
    "timeField": "timestamp",
    "metaField": "deviceID",
    "granularity": "minutes"
  }
});

// Create cmpnd idx for performance of partitionBy/sortBy of setWindowFields
db.device_status.createIndex({"deviceID": 1, "timestamp": 1});

// Insert 9 records into the deployments collection
db.device_status.insertMany([
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:09:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "FAN-999",    
    "timestamp": ISODate("2021-07-03T11:09:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:19:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "FAN-999",    
    "timestamp": ISODate("2021-07-03T11:39:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:39:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:49:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:59:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "DEHUMIDIFIER-555",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "state": "on",     
  },
]);

// Define the pipeline
var pipeline = [
  // Capture previous+next records' state into new fields in current record
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "previousState": {
        "$shift": {
          "output": "$state",
          "by": -1,
        }
      },
      "nextState": {
        "$shift": {
          "output": "$state",
          "by": 1,
        }
      },
    }
  }},

  // Use current record's timestamp as "startTimestamp" only if state
  // changed from previous record in series, and only set "endMarkerDate"
  // to current record's timestamp if the state changes between current
  // and next records in the series
  {"$set": {
    "startTimestamp" : {
      "$cond": [
        {"$eq": ["$state", "$previousState"]}, 
        "$$REMOVE",
        "$timestamp",
      ]    
    },
    "endMarkerDate" : {
      "$cond": [
        {"$eq": ["$state", "$nextState"]}, 
        "$$REMOVE",
        "$timestamp",
      ]    
    },
  }},
  
  // Only keep records where the state has just changed or is just about
  // to change - therefore, this will be mostly start/end pairs, but not
  // always, if the state change only lasted one record
  {"$match": {
    "$expr": {
      "$or": [     
        {"$ne": ["$state", "$previousState"]},
        {"$ne": ["$state", "$nextState"]},
      ]
    }
  }},    
  
  // Set "nextMarkerDate" to the timestamp of the next record in the
  // series - this will be set to 'null', if there is no no next record,
  // to indicate 'unbounded'
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "nextMarkerDate": {
        "$shift": {
          "output": "$timestamp",
          "by": 1,
        }
      },
    }
  }},  

  // Only keep records at the start of the state change boundaries (throw
  // away matching pair end records, if any)
  {"$match": {
    "$expr": {
      "$ne": ["$state", "$previousState"],
    }
  }},
    
  // If no boundary after this record (it's the last matching record in
  // the series), set "endTimestamp" as unbounded (null).
  //
  // Otherwise, if this start boundary record was also an end boundary
  // record (not paired - with only 1 record before state changed), set
  // "endTimestamp" to end timestamp.
  //
  // Otherwise, set "endTimestamp" to what was the captured timestamp
  // from the original matching pair in the series (where the end paired
  // record has since been removed).
  {"$set": {
    "endTimestamp" : {
      "$switch": {
        "branches": [
          // Unbounded, so no final timestamp in series
          {"case": 
            {"$eq": [{"$type": "$nextMarkerDate"}, "null"]},
            "then": null
          },  
          // Use end timestamp from what was same end record as start record
          {"case": 
            {"$ne": [{"$type": "$endMarkerDate"}, "missing"]},
            "then": "$endMarkerDate"
          },  
        ],
        // Use timestamp from what was an end record paired with
        // separate start record
        "default": "$nextMarkerDate",  
      }
    },   
  }},

  // Remove unwanted fields from the final result
  {"$unset": [
    "_id",
    "timestamp",
    "previousState",
    "nextState",
    "endMarkerDate",
    "nextMarkerDate",
  ]}
];

// Execute the aggregation and print the result
var result = db.device_status.aggregate(pipeline);
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output

