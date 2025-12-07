// pour que ce soit bien centré au milieu
var width = 900,
    height = 600;

var svg = d3
    .select("#svg-wrapper") // juste pour le css sinon c'est bien body
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var tooltip = d3.select('body').append('div')
			      .attr('class', 'hidden tooltip');

// on met tout ça dans un groupe g
var g = svg.append("g");

// on définit la projection
var projection = d3.geoConicConformal()
    .center([2.454071, 46.279229])
    .translate([width / 2, height / 2])
    .scale(2800);

var color = d3
    .scaleQuantize()
    .range(["#fff0f5",  "#f8c9dd",  "#ee92c3",  "#d85a9c",  "#d63384"]);

var path = d3.geoPath().projection(projection);

// let anneeChoisie = 2011;
let annees = [2009, 2011, 2013, 2015, 2017, 2019, 2021];

var json;

function drawMap(index) {
    g.selectAll("path")
                .data(json.features)
                .join("path")
                .attr("d", path)
                .on("mouseover", function(e, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("filter", "brightness(130%) drop-shadow(0 0 6px rgba(214,51,132,0.45))")
                        .attr("stroke", "#e10975ff")
                        .attr("stroke-width", 2);
                })
                .on('mousemove', function(e,d) {
                    var mousePosition = [e.x, e.y];
                    console.log(mousePosition);
                    tooltip.classed('hidden', false)
                    .attr('style', 'left:' + (mousePosition[0] + 20) + 'px; top:' + (mousePosition[1] - 20) + 'px')
                    .html("Région : " + d.properties.nom + " (" + d.properties.code + ")" 
                        + "<br>Tonnage : " + d.properties.values[index]); // on récupère le nom et le tonnage

                })
                .on('mouseout', function() {
                    // on cache le toolip
                    tooltip.classed('hidden', true);
                    
                    // on remet comme c'était avant
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style("filter", "none")
                        .attr("stroke", "#c48bb3")
                        .attr("stroke-width", 0.6);
                })
                .transition()
                .duration(450)
                .style("fill", function (d) {

                    // on prend la valeur récupérée plus haut
                    var value = d.properties.values[index];

                    if (value) {
                        return color(value);
                    } else {
                        // si pas de valeur alors en gris
                        return "#ccc";
                    }
                })
                .attr("stroke", "#c48bb3")
                .attr("stroke-width", 0.6);
                
    d3.select('#year').html(annees[index]);
}

d3.csv("data/SINOE14_TonnageDecheterieParTypeDechet.csv").then(function (data) {

    // ne garder que les lignes où (L_TYP_REG_DECHET === "DEEE")
    var cleanData = data.filter(function (d) {
        return d.L_TYP_REG_DECHET == "DEEE";
    });

    // pour ne pas avoir parsefloat(string) mais parsefloat(float)
    cleanData.forEach(function (d) {
        d.TONNAGE_T = parseFloat(d.TONNAGE_T
        .replace(/"/g, "")   // on enlève les guillemets du string
        .replace(",", "."));  // on remplace la virgule par un point 
    });

    color.domain([
        d3.min(cleanData, function (d) { return d.TONNAGE_T; }),
        d3.max(cleanData, function (d) { return d.TONNAGE_T; })
    ]);

    // debug
    // console.log("MIN =", d3.min(cleanData, d => d.TONNAGE_T));
    // console.log("MAX =", d3.max(cleanData, d => d.TONNAGE_T));
    // console.log("nombre de lignes =", cleanData.length);

    // chargement du geojson (départements)
    d3.json("data/departements-version-simplifiee.geojson").then(function (js) {
        json = js;
        
        json.features.forEach(function(dep) {

        var codeDep = dep.properties.code;

        // récupérer toutes les lignes du CSV correspondant à ce département
        var lignesDep = cleanData.filter(function(d) {
            return String(d.C_DEPT) === codeDep; // car codeDep est en String dans le json
        });

        // tableau final des valeurs annuelles
        var values = [];

        annees.forEach(function(annee) {
            // find car une année = une ligne
            var ligneAnnee = lignesDep.find(function(d) {
                return +d.ANNEE === +annee;
            });

            // si la ligne existe on extrait le tonnage
            if (ligneAnnee) {
                values.push(ligneAnnee.TONNAGE_T);
            } 
            // sinon pas de données
            else {
                values.push(null);
            }
        });

        // on attache le tableau values au département
        dep.properties.values = values;
        console.log(values);
    });

    drawMap(0); // au début on draw la carte à 2009 

    d3.select("#slider").on("input", function() {
        drawMap(this.value);
    });

    });
});
