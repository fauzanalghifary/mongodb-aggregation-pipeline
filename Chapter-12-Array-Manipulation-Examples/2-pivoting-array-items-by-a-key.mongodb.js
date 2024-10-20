db = db.getSiblingDB("book-pivot-array-by-key");
db.dropDatabase();

// Inserts records into the weather_measurements collection
db.weather_measurements.insertMany([
  {
    "weatherStationsZone": "FieldZone-ABCD",
    "dayHour": ISODate("2021-07-05T15:00:00.000Z"),
    "readings": [
      {"device": "ABCD-Device-123", "tempCelsius": 18},        
      {"device": "ABCD-Device-789", "pressureMBar": 1004},        
      {"device": "ABCD-Device-123", "humidityPercent": 31},        
      {"device": "ABCD-Device-123", "tempCelsius": 19},        
      {"device": "ABCD-Device-123", "pressureMBar": 1005},        
      {"device": "ABCD-Device-789", "humidityPercent": 31},        
      {"device": "ABCD-Device-123", "humidityPercent": 30},        
      {"device": "ABCD-Device-789", "tempCelsius": 20},        
      {"device": "ABCD-Device-789", "pressureMBar": 1003},        
    ],
  },
  {
    "weatherStationsZone": "FieldZone-ABCD",
    "dayHour": ISODate("2021-07-05T16:00:00.000Z"),
    "readings": [
      {"device": "ABCD-Device-789", "humidityPercent": 33},        
      {"device": "ABCD-Device-123", "humidityPercent": 32},        
      {"device": "ABCD-Device-123", "tempCelsius": 22},        
      {"device": "ABCD-Device-123", "pressureMBar": 1007},        
      {"device": "ABCD-Device-789", "pressureMBar": 1008},        
      {"device": "ABCD-Device-789", "tempCelsius": 22},        
      {"device": "ABCD-Device-789", "humidityPercent": 34},        
    ],
  },
]);

// Define the pipeline
var pipeline = [
  // Loop each unique device to accumulate array of devices & their readings
  {"$set": {
    "readings_device_summary": {
      "$map": {
        "input": {
          "$setUnion": "$readings.device"  // Get only unique device ids
        },
        "as": "device",
        "in": {
          "$mergeObjects": {  // Merge array of key:values into single object
            "$filter": {
              "input": "$readings",  // Iterate the "readings" array field
              "as": "reading",  // Name the current array element "reading"
              "cond": {  // Only include device props matching current device
                "$eq": ["$$reading.device", "$$device"]
              }
            }
          }
        }
      }
    },
  }},
  
  // Exclude unrequired fields from each record
  {"$unset": [
    "_id",
    "readings",
  ]},  
];

// Execute the aggregation and print the result
var result = db.weather_measurements.aggregate(pipeline);
printjson(result);  // MongoDB Shell script output
result;             // VSCode MongoDB Playground output

