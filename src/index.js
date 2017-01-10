/* jshint esnext: true */
var d3 = require('d3');
var mapboxgl = require('mapbox-gl');
var styleUrl = 'https://api.mapbox.com/styles/v1/stevage/cixfrvgyy00fz2pohtlvhosae'
                +'?fresh=true&access_token=pk.eyJ1Ijoic3RldmFnZSIsImEiOiJGcW03aExzIn0.QUkUmTGIO3gGt83HiRIjQw&_=6';
var layers = [];
var chroniton = require('chroniton');
var urijs = require('urijs');

var map;

var filterYear;
var filterPerson = urijs.parseQuery(window.location.search).person || 'Everyone';

function setYearFilter(year) {
    filterYear = year;
    updateFilter();
}

function setPersonFilter(person) {
    filterPerson = person;
    updateFilter();
}


const pplNumbers = [1,2,4,8,16,32];

function updateFilter() {
    // this whole thing about ppl is because line-width isn't currently supported as a data-driven property https://github.com/mapbox/mapbox-gl-style-spec/issues/633
    pplNumbers.forEach(ppl => {
        map.setFilter(`tour-${ppl}`, pplFilter(ppl, filterYear));
        map.setFilter(`tour-labels-${ppl}`, pplFilter(ppl, filterYear));
    });

}


function pplFilter(ppl,year) {
    var ret = ['all', ['>=', 'Participants', ppl], ['<', 'Participants', ppl*2]];
    if (year && year !== 2007)
        ret.push(['==', 'Year', year]);
    if (filterPerson && filterPerson !== 'Everyone') {
        ret.push(['!=', filterPerson, '']);
    }
    // This filters out private cycle tours...
    ret.push(['has', 'Steve']);
    
    return ret;
}

const yearColor = year => `hsl(${(year - 2016)*50 + 240}, ${(year - 2016)*4 + 90}%, 50%)`;

const yearColorStops = {
    property: 'Year',
    type: 'exponential',
    stops: [2007,2008,2009, 2010,2011,2012,2013,2014,2015,2016]
    .map(year => [year, yearColor(year)]),
    colorSpace: 'hcl'
};


function updateStyle() {
}

d3.json(styleUrl, function(style) {

    style.layers.push({
        id: 'highlight',
        source: 'composite',//'stevage.cycletours-5sht4b',
        type: 'line',
        filter: ['==','ID', 'NULL'],
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': 'white',
            'line-width': 1,
            'line-opacity': 0.4,
            'line-gap-width': 10
            //'line-blur': 2
        },
        'source-layer': 'cycletours-1dboad'
    });



    //[2007,2008,2009, 2010,2011,2012,2013,2014,2015,2016].
    pplNumbers.forEach((ppl,index) => {
        style.layers.push({
            id: `tour-${ppl}`,
            source: 'composite',//'stevage.cycletours-5sht4b',
            type: 'line',
            filter: pplFilter(ppl),
            layout: {
                'line-join': 'round'
            },
            paint: {
                'line-color': yearColorStops,
                // 'line-color': {
                //     property: 'ppl',
                //     type: 'exponential',
                //     stops: [
                //         [1, 'red'],
                //         [16, 'blue']
                //     ],
                //     colorSpace: 'hcl'
                    
                // },
                // //'line-color': 'green',
                'line-width': index+0.5,
                'line-opacity': 0.7
            },
            'source-layer': 'cycletours-1dboad'

        });
        layers.push(`tour-${ppl}`);
        style.layers.push({
            id: `tour-labels-${ppl}`,
            source: 'composite',
            type: 'symbol',
            filter: pplFilter(ppl),
            layout: {
                'symbol-placement': 'line',
                'text-field': '{Name}',
                'text-size': 10,
                'text-allow-overlap': true,
                'symbol-spacing': 90,
                'text-max-angle': 100
            },
            'source-layer': 'cycletours-1dboad',
            paint: {
                'text-color': 'yellow',//yearColorStops, // not supported yet
                'text-halo-color': 'black',
                'text-halo-width': 1
            }

        });
        layers.push(`tour-labels-${ppl}`);
    });
        console.log(style.layers);

    mapboxgl.accessToken = 'pk.eyJ1Ijoic3RldmFnZSIsImEiOiJGcW03aExzIn0.QUkUmTGIO3gGt83HiRIjQw';
    map = new mapboxgl.Map({
        container: 'map', // container id
        style: style,//'mapbox://styles/gisfeedback/ciwmwq2gb00fa2ppabho4z39c/', //stylesheet location
        center: [144.97, -37.82], // starting position
        zoom: 7,
        minZoom: 6.5,
        pitch: 0
    });

    map.on('mousemove',e => {
        var features = map.queryRenderedFeatures([
            [ e.point.x - 2, e.point.y -2 ], [ e.point.x + 2, e.point.y + 2]],
            { layers: layers }); 
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = (features && features.length) ? 'pointer' : '';
        if (features && features.length) {
            var p = features[0].properties;
            console.log(p);
            d3.select('#featureinfo').html(`\
                <h3>${p.Name}</h3>\
                ${p.Year}<br/>\
                ${p.Days} days, ${p.Km} km<br/>\
                ${p.Participants} people<br/>\
                `);
            map.setFilter(`highlight`, ['==', 'ID', p.ID]);
        } else {
            map.setFilter(`highlight`, ['==', 'ID', 'NULL']);
        }
    });
    var start=2007, end=2016;
    map.on('load', () => {
        d3.select('#timeslider')
        .call(chroniton()
            .domain([new Date(start,1), new Date(end,1)])
            .tapAxis(function(axis) { axis.ticks(end-start); })
            .height(30)
            .on('change', date => setYearFilter(date.getFullYear()))
            //.play()
            .loop(true)
            .playButton(true)
            .hideLabel()
        );

        d3.select('#filters')
            .selectAll('label')
            .data(['Everyone', ...['Everyone', 'Alex','Steve','Felix','Ellen','Tom','Dave B','Andrew','Lachie','Matt','Rhonda', 
                  'Miriam','Rowena','Rosie', 'Jo','Hayden','Mikhaila','Mitch','Nathan','Rob'].sort()])
            .enter()
            .append('label')
                
                .html(d => `<label id="${d}-label"><input type="radio" name="checkbox" id="${d}-checkbox"><span>${d}</span></input></label>`)
                .on('click', d=>setPersonFilter(d))
            ;
        document.querySelector(`#${filterPerson}-checkbox`).click();
    });
});