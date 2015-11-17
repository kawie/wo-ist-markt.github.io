var TILES_URL = 'http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
var INITIAL_LOCATION = [49.0140679, 8.4044366];
var INITIAL_ZOOM = 13;
var ATTRIBUTION = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> ' +
                  'contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">' +
                  'CC-BY-SA</a>. Tiles &copy; <a href="http://cartodb.com/attributions">' +
                  'CartoDB</a>';

var map;
var nowGroup = L.layerGroup();
var todayGroup = L.layerGroup();
var otherGroup = L.layerGroup();

var now = new Date();
var TIME_NOW = [now.getHours(), now.getMinutes()];
var DAY_INDEX = (now.getDay() + 6) % 7;  // In our data, first day is Monday
var DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
var nowIcon = L.AwesomeMarkers.icon({markerColor: 'green', icon: 'shopping-cart'});
var todayIcon = L.AwesomeMarkers.icon({markerColor: 'darkgreen', icon: 'shopping-cart'});
var otherIcon = L.AwesomeMarkers.icon({markerColor: 'cadetblue', icon: 'shopping-cart'});

/*
 * Return 0-padded string of a number.
 */
function pad(num, totalDigits) {
    var s = num.toString();
    while (s.length < totalDigits) {
        s = '0' + s;
    }
    return s;
}

/*
 * Create time-table HTML code.
 *
 * `times` is a list of 7 items. Each item is either `null`
 * (market is not open on that day) or a 2-tuple consisting
 * of the opening and closing times (each of which is given
 * as a 2-tuple consisting of the hour and the minutes).
 */
function timeTable(times) {
    s = '<table class="times">';
    for (var i = 0; i < 7; i++) {
        var t = times[i];
        if (t !== null) {
            if (i === DAY_INDEX) {
                cls = ' class="today"';
            } else {
                cls = '';
            }
            s += '<tr' + cls + '><th>' + DAY_NAMES[i] + '</th><td>' +
                 t[0][0] + ':' + pad(t[0][1], 2) + ' - ' + t[1][0] + ':' + pad(t[1][1], 2) +
                 ' Uhr</td></tr>';
        }
    }
    s += '</table>';
    return s;
}

/*
 * Check if 2-tuple `a1` is lexicographically greater than
 * 2-tuple `a2`.
 */
function lexgt(a1, a2) {
    return (a1[0] > a2[0] || (a1[0] === a2[0] && a1[1] > a2[1]));
}

/*
 * Returns true if time is within the given time range; otherwise false.
 */
function timeRangeContainsTime(timeRange, time) {
    var startTime = timeRange[0];
    var endTime = timeRange[1];
    return lexgt(time, startTime) && lexgt(endTime, time);
}

/*
 * Initialize map.
 */
function initMap() {
    var tiles = new L.TileLayer(TILES_URL, {attribution: ATTRIBUTION});
    map = new L.Map('map').addLayer(tiles).setView(INITIAL_LOCATION, INITIAL_ZOOM);
}

/*
 * Initialize layer controls.
 *
 * Controls which serve no purpose are disabled. For example, if
 * currently no markets are open then the corresponding radio
 * button is disabled.
 */
function initControls() {
    var todayCount = todayGroup.getLayers().length;
    if (todayCount === 0) {
        // No markets today or all of today's markets currently open
        $('#today').attr('disabled', true);
    }
    if (nowGroup.getLayers().length > 0) {
        $('#now').attr('checked', true);
    } else {
        $('#now').attr('disabled', true);
        if (todayCount > 0) {
            $('#today').attr('checked', true);
        } else {
            $('#other').attr('checked', true);
        }
    }
    $("input[name=display]").change(updateLayers);
}

/*
 * Update layer visibility according to layer control settings.
 */
function updateLayers() {
    var value = document.querySelector('[name="display"]:checked').value;
    switch (value) {
        case "now":
            map.removeLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case "today":
            map.addLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case "other":
            map.addLayer(todayGroup);
            map.addLayer(otherGroup);
            break;
    }
}

/*
 * Create map markers from JSON market data.
 */
function initMarkers(json) {
    for (var market in json) {
        var data = json[market];
        var times = data['days'];
        var todayTimes = times[DAY_INDEX];
        var marker = L.marker(data['coordinates']);
        var where = data['location'];
        if (where !== null) {
            where = '<p>' + where + '</p>';
        } else {
            where = '';
        }
        var timeTableHtml = timeTable(times);
        var popupHtml = '<h1>' + market + '</h1>' + where + timeTableHtml;
        marker.bindPopup(popupHtml);
        if (todayTimes !== null) {
            if (timeRangeContainsTime(todayTimes, TIME_NOW)) {
                marker.setIcon(nowIcon);
                nowGroup.addLayer(marker);
            } else {
                marker.setIcon(todayIcon);
                todayGroup.addLayer(marker);
            }
        } else {
            marker.setIcon(otherIcon);
            otherGroup.addLayer(marker);
        }
    }
}

/*
 * Initialize legend.
 */
function initLegend() {
    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function (m) {
        return L.DomUtil.get('legend');
    };
    legend.addTo(map);
}

$(document).ready(function() {
    initMap();
    initLegend();
    $.getJSON("markt.json", function(json) {
        initMarkers(json);
        initControls();
        map.addLayer(nowGroup);
        updateLayers();
    });
});