# socrata-visualizations.js (v1.0)

Javascript library to quickly render graphic components based on Socrata as the data source.

# Quick start

  1. Download package...
  
  2. Add socrata-visualizations.js and css to your site:

    ```html
        <link rel="stylesheet" href="../vendors/c3/c3.css" />
        <script src="./vendors/jquery-1.11.3.min.js"></script>
        <script src="./vendors/d3.min.js"></script>
        <script src="./vendors/c3/c3.min.js"></script>
        <script src="./vendors/soda-js.js"></script>
        <script src="./socrata-visualizations.js"></script>
    ```

  3. Create the map and add the layer

    ```javascript
    pieStationCount = new SV.PieChart('#countStation', {
        table: '6yvf-kk3n',
        baseUrl: 'soda.demo.socrata.com'
    });

    pieStationCount.loadCount('number_of_stations');
    ```

# Overview

## Classes

* SV - Main class
* SV.PieChart - Pie chart class
* SV.Store - Stand alone store class

---------------------------------------

# SV.PieChart

## Properties

### table
This is the 4x4

## Methods

### loadCount(column)
This is a shortcut function of store.load() 

### loadSum(column, options)

## Events

---------------------------------------

# SV.Store (Class)
This is part of each of the visualization components and it can be used independtly

## methods

### load(options, callback)

---------------------------------------

# License MIT