String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

/* EventManager, v1.0.1
 *
 * Copyright (c) 2009, Howard Rauscher
 * Licensed under the MIT License
 */

(function () {

    function EventManager() {
        this._listeners = {};
    }
    EventManager.prototype = {
        addListener: function (name, fn) {
            (this._listeners[name] = this._listeners[name] || []).push(fn);
            return this;
        },
        removeListener: function (name, fn) {
            if (arguments.length === 1) { // remove all
                this._listeners[name] = [];
            } else if (typeof (fn) === 'function') {
                var listeners = this._listeners[name];
                if (listeners !== undefined) {
                    var foundAt = -1;
                    for (var i = 0, len = listeners.length; i < len && foundAt === -1; i++) {
                        if (listeners[i] === fn) {
                            foundAt = i;
                        }
                    }

                    if (foundAt >= 0) {
                        listeners.splice(foundAt, 1);
                    }
                }
            }

            return this;
        },
        fire: function (name, args) {
            var listeners = this._listeners[name];
            args = args || [];
            if (listeners !== undefined) {
                var data = {},
                    evt;
                for (var i = 0, len = listeners.length; i < len; i++) {
                    evt = new EventManager.EventArg(name, data);

                    listeners[i].apply(window, args.concat(evt));

                    data = evt.data;
                    if (evt.removed) {
                        listeners.splice(i, 1);
                        len = listeners.length;
                        --i;
                    }
                    if (evt.cancelled) {
                        break;
                    }
                }
            }
            return this;
        },
        hasListeners: function (name) {
            return (this._listeners[name] === undefined ? 0 : this._listeners[name].length) > 0;
        }
    };
    EventManager.eventify = function (object, manager) {
        var methods = EventManager.eventify.methods;
        manager = manager || new EventManager();

        for (var i = 0, len = methods.length; i < len; i++)(function (method) {
            object[method] = function () {
                return manager[method].apply(manager, arguments);
            };
        })(methods[i]);

        return manager;
    };
    EventManager.eventify.methods = ['addListener', 'removeListener', 'fire'];

    EventManager.EventArg = function (name, data) {
        this.name = name;
        this.data = data;
        this.cancelled = false;
        this.removed = false;
    };
    EventManager.EventArg.prototype = {
        cancel: function () {
            this.cancelled = true;
        },
        remove: function () {
            this.removed = true;
        }
    };

    window.EventManager = EventManager;
})();

SV = (typeof SV !== 'undefined') ? SV : {};

SV.chart = function () {
    return this;
}

SV.chart.prototype.generateChart = function (options) {
    return c3.generate({
        bindto: options.bindto,
        size: options.size,
        data: options.data,
        legend: (options.legend ? options.legend : {
            show: false
        }),
        color: (options.color ? {
            pattern: options.color
        } : {}),
        padding: (options.padding) ? options.padding : {
            top: 0,
            right: 0,
            left: 0,
            bottom: 0
        },
        pie: options.pie ? options.pie : {
            label: {
                show: false
            }
        },
        axis: (options.axis ? options.axis : {})
    });
}

SV.Store = function (options, parent) {
    if (options) $.extend(this, {}, options);
    if(parent) {
        this._parent = parent;
    }
    if(this.baseUrl) {
        this.baseUrl = this.baseUrl.replace(/https:\/\//,'').replace(/http:\/\//,'');
        this.baseUrl = "https://" + this.baseUrl;
    }
//    this.consumer = new soda.Consumer(this.baseUrl);
    EventManager.eventify(this);
    return this;
}

SV.Store.prototype.load = function (options, callback) {
    var self = this;
    var where = null;
    if(options.field && self._parent) {
        self._parent.field = options.field;
    }
//    console.log(self.baseUrl + '/resource/' + self.table + '.json', options.filter);
    if(options.filter) {
        $.getJSON(self.baseUrl + '/resource/' + self.table + '.json', options.filter, function (rows) {
            if (rows) {
                self.fire('load', [rows]);
                if (callback) {
                    callback(rows);
                }
            }
        }).fail(function() {
            console.log("Error in query");
        });
    }
    return this;
}

SV.Combo = function (el, options) {
    var self = this;
    this.el = el;
    if (options) $.extend(this, {}, options);
    EventManager.eventify(this);
    this.store = new SV.Store({
        field: this.field,
        table: this.table,
        baseUrl: this.baseUrl
    })
    this.store.addListener('load', function (data) {
        self.render(data);
    })
    return this;
}

SV.Combo.prototype.render = function (data) {
    var self = this;
    if (data) {
        $(self.el).empty();
        $(self.el).change('foo', $.proxy(function (data) {
            this.value = $(this.el + " option:selected").val();
            this.fire('change', [$(this.el + " option:selected").val()]);
        }, this));
        data = data.map(function(rec) {
            return rec[self.field];
        });
        $(this.el).append('<option value="' + this.defaultvalue + '" selected>' + this.defaulttext + '</option>');
        data.forEach(function (cat) {
            $(self.el).append('<option value="' + cat + '" >' + cat + '</option>');
        });
        this.value = $(this.el + " option:selected").val();
    }
    return this;
}

SV.PieChart = function (el, options) {
    var self = this;
    this.el = el;
    this.divisions = 0;
    this.total = 0;
    if (options) $.extend(this, {}, options);
    EventManager.eventify(this);
    this.chart = new SV.chart();
    this.store = new SV.Store({
        field: this.field,
        table: this.table,
        baseUrl: this.baseUrl
    }, this);
    this.store.addListener('load', function (data) {
        self.render(data);
    });
    return this;
}

SV.PieChart.prototype._transform = function (data, label) {
    var output = [];
    var total = 0;
    if (label === undefined) {
        for (var key in data[0]) {
            if (data[0].hasOwnProperty(key)) {
                output.push([key.replace(/_/g, " ").toProperCase(), data[0][key]])
            }
        }
        return output
    } else {
        $.each(data, function (idx, rec) {
            rec.count = (typeof rec.count != 'undefined') ? rec.count : 0;
            if (typeof rec[label] === 'boolean') {
                output.push([rec[label] ? 'Yes' : 'No', rec.count]);
            } else {
                rec[label] = rec[label] + '';
                output.push([rec[label].toProperCase(), rec.count]);
            }
            total += +rec.count;
        });
        if (total == 0) {
            return false;
        } else {
            return output;
        }
    }
}

SV.PieChart.prototype._transformNormalize = function (data, groups) {
    $.each(data, function (idx, rec) {
        for (group in groups[0]) {
            rec[groups[0][group]] = Math.round((rec[groups[0][group]] / rec.total) * 100) / 100
        }
    });
    return data;
}

SV.PieChart.prototype.render = function (data) {
    var self = this;
    if (data) {
        data = this._transform(data, this.field);
        var optdata = {
            columns: data,
            type: 'pie'
        };
        (this.colors) ? (optdata.colors = this.colors) : '';
        (this.color) ? (optdata.color = this.color) : '';

        var opts = {
            bindto: self.el,
            data: optdata,
            pie: this.pie ? this.pie : {
                label: {
                    show: false
                }
            },
            size: (this.size) ? this.size : {
                width: 300,
                height: 300
            }
        };
        (this.patterncolors) ? (opts.color = this.patterncolors) : '';
        (this.legend) ? (opts.legend = this.legend) : '';
        var pie = this.chart.generateChart(opts);

        self.chartObj = pie;
        var dts = pie.data();
        self.divisions = dts.length;
        self.total = 0;
        dts.forEach(function (dt) {
            if (dt.values && dt.values[0] && dt.values[0].value) {
                self.total = self.total + dt.values[0].value;
            }
        });
        /*        
                var txtData = {};
                var total = +pie.data.values('Published') + +pie.data.values('Not Published');
                txtData.total = total;
                txtData.percentage = Math.round(pie.data.values(this.percentageKey) / total * 100) + '%';
                txtData.ratio = (pie.data.values(this.percentageKey) ? pie.data.values(this.percentageKey) : 0) + "/" + total + " datasets";
                self.fire('change', [txtData]);
        */
        self.fire('change', []);
    }
    return this;
}

SV.PieChart.prototype.getPercent = function (ky) {
    var op = null;
    if (ky && this.chartObj && this.chartObj.data()) {
        this.chartObj.data().forEach(function (dt) {
            if (ky == dt.id) {
                if (dt && dt.values && dt.values[0] && dt.values[0].value) {
                    op = dt.values[0].value;
                }
            }
        });
    }
    return Math.round((op / this.total) * 100) + '%';
}

SV.PieChart.prototype.getValue = function (ky) {
    var op = null;
    if (ky && this.chartObj && this.chartObj.data()) {
        this.chartObj.data().forEach(function (dt) {
            if (ky == dt.id) {
                if (dt && dt.values && dt.values[0] && dt.values[0].value) {
                    op = dt.values[0].value;
                }
            }
        });
    }
    return op;
}

SV.PieChart.prototype.loadCount = function (field, options) {
    var self = this;
    var storeoptions = {};
    storeoptions.field = field;
    
    var select = [field];
    select.push( (options && options.aggregatefield)? 'count(' + options.aggregatefield + ') AS count' : 'count(*) AS count');
    storeoptions.filter = {
        "$select": select.join(',')
    };
    if(options && options.where) {
         storeoptions.filter["$where"] = options.where;
    }
    if(options && options.where) {
         storeoptions.filter["$order"] = options.order;
    }
    storeoptions.filter["$group"] = field;
    
    self.store.load(storeoptions);
}

SV.PieChart.prototype.loadAvg = function (field, options) {
    var self = this;
    var storeoptions = {};
    storeoptions.field = field;
    storeoptions.group = field;
    
    var select = [field];
    select.push( (options && options.aggregatefield)? 'avg(' + options.aggregatefield + ') AS count' : 'avg(*) AS count');
    storeoptions.filter = {
        "$select": select.join(',')
    };
    if(options && options.where) {
         storeoptions.filter["$where"] = options.where;
    }
    if(options && options.where) {
         storeoptions.filter["$order"] = options.order;
    }
    storeoptions.filter["$group"] = field;
    
    self.store.load(storeoptions);
}

SV.PieChart.prototype.loadSum = function (field, options) {
    var self = this;
    var storeoptions = {};
    storeoptions.field = field;
    storeoptions.group = field;
    
    var select = [field];
    select.push( (options && options.aggregatefield)? 'sum(' + options.aggregatefield + ') AS count' : 'sum(*) AS count');
    storeoptions.filter = {
        "$select": select.join(',')
    };
    if(options && options.where) {
         storeoptions.filter["$where"] = options.where;
    }
    if(options && options.where) {
         storeoptions.filter["$order"] = options.order;
    }
    storeoptions.filter["$group"] = field;
    
    self.store.load(storeoptions);
}

SV.BarChart = function (el, options) {
    var self = this;
    this.divisions = 0;
    this.total = 0;
    this.el = el;
    if (options) $.extend(this, {}, options);
    EventManager.eventify(this);
    this.chart = new SV.chart();
    this.store = new SV.Store({
        field: this.field,
        table: this.table,
        baseUrl: this.baseUrl
    }, this)
    this.store.addListener('load', function (data) {
        self.render(data);
    });
    return this;
}

SV.BarChart.prototype._transformNormalize = function (data, groups) {
    $.each(data, function (idx, rec) {
        for (group in groups[0]) {
            rec[groups[0][group]] = Math.round((rec[groups[0][group]] / rec.total) * 100) / 100
        }
    });
    return data;
}

SV.BarChart.prototype.render = function (data) {
    var self = this;
    if (this.transformtype) {
        switch (this.transformtype) {
            case 'normalize':
                data = this._transformNormalize(data, this.groups);
                break;
            case 'transform':
                data = this._transform(data, this.field);
                break;
        }
    }

    if (data) {
        var optdata = {
            xFormat: this.xFormat,
            json: data,
            mimeType: this.mimeType,
            keys: this.keys,
            type: 'bar'
        };
        (this.colors) ? (optdata.colors = this.colors) : '';
        (this.names) ? (optdata.names = this.names) : '';
        (this.groups) ? (optdata.groups = this.groups) : '';
        var opts = {
            bindto: this.el,
            data: optdata,
            axis: this.axis,
            size: (this.size) ? this.size : {
                width: 300,
                height: 300
            }
        };

        var bar = this.chart.generateChart(opts);
        self.chartObj = bar;
        var dts = bar.data();
        self.divisions = dts.length;
        self.total = 0;
        dts.forEach(function (dt) {
            if (dt.values && dt.values[0] && dt.values[0].value) {
                self.total = self.total + dt.values[0].value;
            }
        });
        self.fire('change', [bar.data]);
    }
    return this;
}

SV.BarChart.prototype.getPercent = function (ky) {
    var op = null;
    if (ky && this.chartObj && this.chartObj.data()) {
        this.chartObj.data().forEach(function (dt) {
            if (ky == dt.id) {
                if (dt && dt.values && dt.values[0] && dt.values[0].value) {
                    op = dt.values[0].value;
                }
            }
        });

    }
    return Math.round((op / this.total) * 100) + '%';
}

SV.BarChart.prototype.getValue = function (ky) {
    var op = null;
    if (ky && this.chartObj && this.chartObj.data()) {
        this.chartObj.data().forEach(function (dt) {
            if (ky == dt.id) {
                if (dt && dt.values && dt.values[0] && dt.values[0].value) {
                    op = dt.values[0].value;
                }
            }
        });

    }
    return op;
}

SV.BarChart.prototype.loadCount = function (field, options) {
    var self = this;
    var storeoptions = {};
    storeoptions.field = field;
    
    var select = [field];
    select.push( (options && options.aggregatefield)? 'count(' + options.aggregatefield + ') AS count' : 'count(*) AS count');
    storeoptions.filter = {
        "$select": select.join(',')
    };
    if(options && options.where) {
         storeoptions.filter["$where"] = options.where;
    }
    if(options && options.where) {
         storeoptions.filter["$order"] = options.order;
    }
    storeoptions.filter["$group"] = field;
    
    self.store.load(storeoptions);
}
