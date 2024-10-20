db = db.getSiblingDB("book-iot-power-consumption");
db.dropDatabase();

// Use a time-series collection for optimal processing
// NOTE: This command can be commented out & this example will still work
db.createCollection("device_readings", {
  "timeseries": {
    "timeField": "timestamp",
    "metaField": "deviceID",
    "granularity": "minutes"
  }
});

// Create cmpnd idx for performance of partitionBy/sortBy of setWindowFields
db.device_readings.createIndex({"deviceID": 1, "timestamp": 1});

// Insert 18 records into the device readings collection
db.device_readings.insertMany([
  // 11:29am device readings
  {
    "buildingID": "Building-ABC", 
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T11:29:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T11:29:59Z"),
    "powerKilowatts": 7,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T11:29:59Z"),
    "powerKilowatts": 10,     
  },
  
  // 11:59am device readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T11:59:59Z"),
    "powerKilowatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T11:59:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T11:59:59Z"),
    "powerKilowatts": 11,     
  },
  
  // 12:29pm device readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T12:29:59Z"),
    "powerKilowatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T12:29:59Z"),
    "powerKilowatts": 9,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T12:29:59Z"),
    "powerKilowatts": 10,     
  },

  // 12:59pm device readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T12:59:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T12:59:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T12:59:59Z"),
    "powerKilowatts": 11,     
  },

  // 13:29pm device readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T13:29:59Z"),
    "powerKilowatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T13:29:59Z"),
    "powerKilowatts": 9,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T13:29:59Z"),
    "powerKilowatts": 10,     
  },

  // 13:59pm device readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-222",    
    "timestamp": ISODate("2021-07-03T13:59:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "UltraAirCon-111",    
    "timestamp": ISODate("2021-07-03T13:59:59Z"),
    "powerKilowatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "UltraAirCon-666",    
    "timestamp": ISODate("2021-07-03T13:59:59Z"),
    "powerKilowatts": 11,     
  },
]);

// Define the pipeline
var pipelineBuildingsSummary = [
  // Calc each unit's energy consumed in last hour for each reading
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "consumedKilowattHours": {
        "$integral": {
          "input": "$powerKilowatts",
          "unit": "hour",
        },
        "window": {
          "range": [-1, "current"],
          "unit": "hour",
        },
      },
    },
  }},
  
  // Sort each reading by unit/device and then by timestamp
  {"$sort": {
    "deviceID": 1,
    "timestamp": 1,
  }},    
  
  // Group readings together for each hour for each device using
  // the last calculated energy consumption field for each hour
  {"$group": {
    "_id": {
      "deviceID": "$deviceID",
      "date": {
          "$dateTrunc": {
            "date": "$timestamp",
            "unit": "hour",
          }
      },
    },
    "buildingID": {"$last": "$buildingID"},
    "consumedKilowattHours": {"$last": "$consumedKilowattHours"},
  }},    

  // Sum together the energy consumption for the whole building
  // for each hour across all the units in the building   
  {"$group": {
    "_id": {
      "buildingID": "$buildingID",
      "dayHour": {
        "$dateToString": {
          "format": "%Y-%m-%d  %H",
          "date": "$_id.date"
        }
      },
    },
    "consumedKilowattHours": {"$sum": "$consumedKilowattHours"},
  }},    

  // Sort the results by each building and then by each hourly summary
  {"$sort": {
    "_id.buildingID": 1,
    "_id.dayHour": 1,
  }},    

  // Make the results more presentable with meaningful field names
  {"$set": {
    "buildingID": "$_id.buildingID",
    "dayHour": "$_id.dayHour",
    "_id": "$$REMOVE",
  }},      
];

// Execute the aggregation and print the result
var result = db.device_readings.aggregate(pipelineBuildingsSummary);
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output

