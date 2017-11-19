
var sigInst, canvas, $GP

//Load configuration file
var config={};


//Load course and school file
var keyword_map={};

////////////////////////////////// ///////////////////////////////// /////////////////////
/////////////////////// d3 global var for drawing chart /////////////////////////////////

var plotFlag = false;

var margin = {top: 20, right: 10, bottom: 80, left: 30},
                w = 300 - margin.left - margin.right,
                h = 200 - margin.top - margin.bottom;
var padding = 10;

var x = d3.scale.ordinal()
            .rangeRoundBands([0, w], .1);

var y = d3.scale.linear()
            .range([h, 0]);

var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5);



//For debug allow a config=file.json parameter to specify the config
function GetQueryStringParams(sParam,defaultVal) {
    var sPageURL = ""+window.location;//.search.substring(1);//This might be causing error in Safari?
    if (sPageURL.indexOf("?")==-1) return defaultVal;
    sPageURL=sPageURL.substr(sPageURL.indexOf("?")+1);    
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return defaultVal;
}


jQuery.getJSON(GetQueryStringParams("config","data/config.json"), function(data, textStatus, jqXHR) {
	config=data;
	
	if (config.type!="network") {
		//bad config
		alert("Invalid configuration settings.")
		return;
	}
	
	//As soon as page is ready (and data ready) set up it
	// $(document).ready(setupGUI(config));
    $(window).load(setupGUI(config));

});//End JSON Config load

// related courses and school data load
jQuery.getJSON("./data/Course_keyword_value.json", function(data, textStatus, jqXHR) {
    console.log(data);
    keyword_map = data;
    // current data-type is {node_id, keywords = [ keyword: value]
});


// FUNCTION DECLARATIONS

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function initSigma(config) {
	var data=config.data
	
	var drawProps, graphProps,mouseProps;
	if (config.sigma && config.sigma.drawingProperties) 
		drawProps=config.sigma.drawingProperties;
	else
		drawProps={
        defaultLabelColor: "#000",
        defaultLabelSize: 14,
        defaultLabelBGColor: "#ddd",
        defaultHoverLabelBGColor: "#002147",
        defaultLabelHoverColor: "#fff",
        labelThreshold: 10,
        defaultEdgeType: "curve",
        hoverFontStyle: "bold",
        fontStyle: "bold",
        activeFontStyle: "bold"
    };
    
    if (config.sigma && config.sigma.graphProperties)	
    	graphProps=config.sigma.graphProperties;
    else
    	graphProps={
        minNodeSize: 1,
        maxNodeSize: 7,
        minEdgeSize: 0.2,
        maxEdgeSize: 0.5
    	};
	
	if (config.sigma && config.sigma.mouseProperties) 
		mouseProps=config.sigma.mouseProperties;
	else
		mouseProps={
        minRatio: 0.10, // How far can we zoom out?
        maxRatio: 0.25, // How far can we zoom in?
    	};
	
    var a = sigma.init(document.getElementById("sigma-canvas")).drawingProperties(drawProps).graphProperties(graphProps).mouseProperties(mouseProps);
    sigInst = a;
    a.active = !1;
    a.neighbors = {};
    a.detail = !1;


    dataReady = function() {//This is called as soon as data is loaded
		a.clusters = {};
        a.providers = {};
        a.schools = {};
        var temp_provider, temp_school;
		a.iterNodes(
			function (b) { //This is where we populate the array used for the group select box

				// note: index may not be consistent for all nodes. Should calculate each time. 
				// alert(JSON.stringify(b.subject));
				//alert(b.attr.attributes['subject']);

				a.clusters[b.color] || (a.clusters[b.color] = []);
				a.clusters[b.color].push(b.id);//SAH: push id not label
                // add each node to subjects array
                temp_provider = b.attr.attributes['provider'];
                a.providers[temp_provider] || (a.providers[temp_provider] = []);
                a.providers[temp_provider].push(b.id);

                temp_school = b.attr.attributes['school'];
                a.schools[temp_school] || (a.schools[temp_school] = []);
                a.schools[temp_school].push(b.id);
			}
		
		);

		a.bind("upnodes", function (a) {
		    nodeActive(a.content[0])
		});

		a.draw();
		configSigmaElements(config);
	}

    if (data.indexOf("gexf")>0 || data.indexOf("xml")>0)
        a.parseGexf(data,dataReady);
    else
	    a.parseJson(data,dataReady);
    gexf = sigmaInst = null;
}


function setupGUI(config) {
	// Initialise main interface elements
	var logo=""; // Logo elements
	if (config.logo.file) {

		logo = "<img src=\"" + config.logo.file +"\"";
		if (config.logo.text) logo+=" alt=\"" + config.logo.text + "\"";
		logo+=">";
	} else if (config.logo.text) {
		logo="<h2>"+config.logo.text+"</h2>";
	}
	if (config.logo.link) logo="<a href=\"" + config.logo.link + "\">"+logo+"</a>";
	$("#maintitle").html(logo);

	// #title
	$("#title").html("<h2>"+config.text.title+"</h2>");

	// #titletext
	$("#titletext").html(config.text.intro);

	// More information
	if (config.text.more) {
		$("#information").html(config.text.more);
	} else {
		//hide more information link
		$("#moreinformation").hide();
	}

	// Legend

	// Node
	if (config.legend.nodeLabel) {
		$(".node").next().html(config.legend.nodeLabel);
	} else {
		//hide more information link
		$(".node").hide();
	}
	// Edge
	if (config.legend.edgeLabel) {
		$(".edge").next().html(config.legend.edgeLabel);
	} else {
		//hide more information link
		$(".edge").hide();
	}
	// Colours
	if (config.legend.nodeLabel) {
		$(".colours").next().html(config.legend.colorLabel);
	} else {
		//hide more information link
		$(".colours").hide();
	}

	$GP = {
		calculating: !1,
		showgroup: !1
	};
    $GP.networkSize = $("#networkSize");
    $GP.intro = $("#intro");
    $GP.minifier = $GP.intro.find("#minifier");
    $GP.mini = $("#minify");
    $GP.info = $("#attributepane");
    $GP.info_donnees = $GP.info.find(".nodeattributes");
    $GP.info_name = $GP.info.find(".name");
    $GP.info_link = $GP.info.find(".link");
    $GP.info_data = $GP.info.find(".data");
    $GP.info_school = $GP.info.find(".school");         //
    $GP.info_close = $GP.info.find(".returntext");
    $GP.info_close2 = $GP.info.find(".close");
    $GP.info_p = $GP.info.find(".p");
    $GP.info_close.click(nodeNormal);
    $GP.info_close2.click(nodeNormal);
    $GP.form = $("#mainpanel").find("form");
    $GP.search = new Search($GP.form.find("#search"));
    if (!config.features.search) {
		$("#search").hide();
	}
	if (!config.features.groupSelectorAttribute) {
		$("#attributeselect").hide();
	}
    $GP.cluster = new Cluster($GP.form.find("#attributeselect"));
    $GP.provider = new Provider($GP.form.find("#providerselect"));
    $GP.school = new School($GP.form.find("#schoolselect"))

    config.GP=$GP;


    //$GP.info.delay(400).animate({width:'hide'},350)

    initSigma(config);
}


// assign variables and functions
function configSigmaElements(config) {
	$GP=config.GP;

    // add nodes' and edges' size to html
    $GP.networkSize.html("<h2>#Node:" + sigInst.getNodesCount() + "<ul> #Edges:" + sigInst.getEdgesCount() + "</h2>");

    // Node hover behaviour
    if (config.features.hoverBehavior == "dim") {

		var greyColor = '#ccc';
		sigInst.bind('overnodes',function(event){
		var nodes = event.content;
		var neighbors = {};
		sigInst.iterEdges(function(e){
		if(nodes.indexOf(e.source)<0 && nodes.indexOf(e.target)<0){
			if(!e.attr['grey']){
				e.attr['true_color'] = e.color;
				e.color = greyColor;
				e.attr['grey'] = 1;
			}
		}else{
			e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
			e.attr['grey'] = 0;

			neighbors[e.source] = 1;
			neighbors[e.target] = 1;
		}
		}).iterNodes(function(n){
			if(!neighbors[n.id]){
				if(!n.attr['grey']){
					n.attr['true_color'] = n.color;
					n.color = greyColor;
					n.attr['grey'] = 1;
				}
			}else{
				n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
				n.attr['grey'] = 0;
			}
		}).draw(2,2,2);
		}).bind('outnodes',function(){
		sigInst.iterEdges(function(e){
			e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
			e.attr['grey'] = 0;
		}).iterNodes(function(n){
			n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
			n.attr['grey'] = 0;
		}).draw(2,2,2);

		});

    } else if (config.features.hoverBehavior == "hide") {

		sigInst.bind('overnodes',function(event){
			var nodes = event.content;
			var neighbors = {};

		sigInst.iterEdges(function(e){
			if(nodes.indexOf(e.source)>=0 || nodes.indexOf(e.target)>=0){
		    	neighbors[e.source] = 1;
		    	neighbors[e.target] = 1;
		  	}
		}).iterNodes(function(n){
		  	if(!neighbors[n.id]){
		    	n.hidden = 1;
		  	}else{
		    	n.hidden = 0;
		  }
		}).draw(2,2,2);
		}).bind('outnodes',function(){
		sigInst.iterEdges(function(e){
		  	e.hidden = 0;
		}).iterNodes(function(n){
		  	n.hidden = 0;
		}).draw(2,2,2);


		});

    }


    $GP.bg = $(sigInst._core.domElements.bg);
    $GP.bg2 = $(sigInst._core.domElements.bg2);
    var a = [],
        b,x=1;
		for (b in sigInst.clusters) {
            //console.log(b);
            a.push('<div style="line-height:12px"><a href="#' + b + '"><div style="width:40px;height:12px;border:1px solid #fff;background:' 
                + b + ';display:inline-block"></div> Group ' + (x++) + ' (' + sigInst.clusters[b].length + ' members)</a></div>');
        }
    //a.sort();
    $GP.cluster.content(a.join(""));

    var provider_list = [];
        
        for(var provider in sigInst.providers){
            //console.log(subject);
            provider_list.push('<div style="line-height:12px"><a href="#' + provider 
                + '">' +provider + ' ('
                + sigInst.providers[provider].length + ' courses)</a></div>');
        }
    provider_list.sort();        
    $GP.provider.content(provider_list.join(""));

    var school_list = [];

        for(var school in sigInst.schools){
            school_list.push('<div style="line-height:12px"><a href="#' + school 
                + '">' +school + ' ('
                + sigInst.schools[school].length + ' courses)</a></div>');
        }
    school_list.sort();
    $GP.school.content(school_list.join(""));



    b = {
        minWidth: 400,
        maxWidth: 800,
        maxHeight: 600
    };//        minHeight: 300,
    //$("a.fb").fancybox(b);

    $("#zoom").find("div.z").each(function () {
        var a = $(this),
            b = a.attr("rel");
        a.click(function () {
			if (b == "center") {
				sigInst.position(0,0,1).draw();
			} else {
		        var a = sigInst._core;
	            sigInst.zoomTo(a.domElements.nodes.width / 2, a.domElements.nodes.height / 2, a.mousecaptor.ratio * ("in" == b ? 1.5 : 0.5));		
			}

        })
    });
    $GP.mini.click(function () {
        $GP.mini.hide();
        $GP.intro.show();
        $GP.minifier.show()
    });
    $GP.minifier.click(function () {
        $GP.intro.hide();
        $GP.minifier.hide();
        $GP.mini.show()
    });
    $GP.intro.find("#showGroups").click(function () {
        !0 == $GP.showgroup ? showGroups(!1) : showGroups(!0)
    });
    a = window.location.hash.substr(1);
    if (0 < a.length) switch (a) {
    case "Groups":
        showGroups(!0);
        break;
    case "information":
        $.fancybox.open($("#information"), b);
        break;
    default:
        $GP.search.exactMatch = !0, $GP.search.search(a)
		$GP.search.clean();
    }

}

function Search(a) {
    this.input = a.find("input[name=search]");
    this.state = a.find(".state");
    this.results = a.find(".results");
    this.exactMatch = !1;
    this.lastSearch = "";
    this.searching = !1;
    var b = this;
    this.input.focus(function () {
        var a = $(this);
        a.data("focus") || (a.data("focus", !0), a.removeClass("empty"));
        b.clean()
    });
    this.input.keydown(function (a) {
        if (13 == a.which) return b.state.addClass("searching"), b.search(b.input.val()), !1
    });
    this.state.click(function () {
        var a = b.input.val();
        b.searching && a == b.lastSearch ? b.close() : (b.state.addClass("searching"), b.search(a))
    });
    this.dom = a;
    this.close = function () {
        this.state.removeClass("searching");
        this.results.hide();
        this.searching = !1;
        this.input.val("");//SAH -- let's erase string when we close
        nodeNormal()
    };
    this.clean = function () {
        this.results.empty().hide();
        this.state.removeClass("searching");
        this.input.val("");
    };
    this.search = function (a) {
        var b = !1,
            c = [],
            b = this.exactMatch ? ("^" + a + "$").toLowerCase() : a.toLowerCase(),
            g = RegExp(b);
        this.exactMatch = !1;
        this.searching = !0;
        this.lastSearch = a;
        this.results.empty();
        if (2 >= a.length) this.results.html("<i>You must search for a name with a minimum of 3 letters.</i>");
        else {
            sigInst.iterNodes(function (a) {
                g.test(a.label.toLowerCase()) && c.push({
                    id: a.id,
                    name: a.label
                })
            });
            c.length ? (b = !0, nodeActive(c[0].id)) : b = showCluster(a);
            a = ["<b>Search Results: </b>"];
            if (1 < c.length) for (var d = 0, h = c.length; d < h; d++) a.push('<a href="#' + c[d].name + '" onclick="clicked_node_inPanel(\'' + c[d].id + "')\">" + c[d].name + "</a>");
            0 == c.length && !b && a.push("<i>No results found.</i>");
            1 < a.length && this.results.html(a.join(""));
           }
        if(c.length!=1) this.results.show();
        if(c.length==1) this.results.hide();   
    }
}

function Cluster(a) {
    this.cluster = a;
    this.display = !1;
    this.list = this.cluster.find(".list");
    this.list.empty();
    this.select = this.cluster.find(".select");
    this.select.click(function () {
        $GP.cluster.toggle()
    });
    this.toggle = function () {
        this.display ? this.hide() : this.show()
    };
    this.content = function (a) {
        this.list.html(a);
        this.list.find("a").click(function () {
            var a = $(this).attr("href").substr(1);
            showCluster(a)
        })
    };
    this.hide = function () {
        this.display = !1;
        this.list.hide();
        this.select.removeClass("close")
    };
    this.show = function () {
        this.display = !0;
        this.list.show();
        this.select.addClass("close")
    }
}

// for provider or school
function Provider(a) {
    this.provider = a;
    this.display = !1;
    this.list = this.provider.find(".list");
    this.list.empty();
    this.select = this.provider.find(".select");
    this.select.click(function () {
        $GP.provider.toggle()
    });
    this.toggle = function () {
        this.display ? this.hide() : this.show()
    };
    this.content = function (a) {
        this.list.html(a);
        this.list.find("a").click(function () {
            var a = $(this).attr("href").substr(1);
            showProvider(a)
        })
    };
    this.hide = function () {
        this.display = !1;
        this.list.hide();
        this.select.removeClass("close")
    };
    this.show = function () {
        this.display = !0;
        this.list.show();
        this.select.addClass("close")
    }
}

function School(a) {
    this.school = a;
    this.display = !1;
    this.list = this.school.find(".list");
    this.list.empty();
    this.select = this.school.find(".select");
    this.select.click(function () {
        $GP.school.toggle()
    });
    this.toggle = function () {
        this.display ? this.hide() : this.show()
    };
    this.content = function (a) {
        this.list.html(a);
        this.list.find("a").click(function () {
            var a = $(this).attr("href").substr(1);
            showSchool(a)
        })
    };
    this.hide = function () {
        this.display = !1;
        this.list.hide();
        this.select.removeClass("close")
    };
    this.show = function () {
        this.display = !0;
        this.list.show();
        this.select.addClass("close")
    }
}

function showGroups(a) {
    console.log("ShowGroups function operates,,,, ")
    a ? ($GP.intro.find("#showGroups").text("Hide groups"), $GP.bg.show(), $GP.bg2.hide(), $GP.showgroup = !0) : ($GP.intro.find("#showGroups").text("View Groups"), $GP.bg.hide(), $GP.bg2.show(), $GP.showgroup = !1)
}

function nodeNormal() {

    
    !0 != $GP.calculating && !1 != sigInst.detail && (showGroups(!1), $GP.calculating = !0, sigInst.detail = !0, $GP.info.delay(400).animate({width:'hide'},350),$GP.cluster.hide(), sigInst.iterEdges(function (a) {
        a.attr.color = !1;
        a.hidden = !1
    }), sigInst.iterNodes(function (a) {
        a.hidden = !1;
        a.attr.color = !1;
        a.attr.lineWidth = !1;
        a.attr.size = !1
    }), sigInst.draw(2, 2, 2, 2), sigInst.neighbors = {}, sigInst.active = !1, $GP.calculating = !1, window.location.hash = "")



}

function nodeActive(a) {

	var groupByDirection=false;
	if (config.informationPanel.groupByEdgeDirection && config.informationPanel.groupByEdgeDirection==true)	groupByDirection=true;
	
    sigInst.neighbors = {};
    sigInst.detail = !0;
    var b = sigInst._core.graph.nodesIndex[a];
    showGroups(!1);
	var outgoing={},incoming={},mutual={};//SAH
    sigInst.iterEdges(function (b) {
        b.attr.lineWidth = !1;
        b.hidden = !0;
        
        n={
            name: b.label,
            colour: b.color
        };
        
   	   if (a==b.source) outgoing[b.target]=n;		//SAH
	   else if (a==b.target) incoming[b.source]=n;		//SAH
       if (a == b.source || a == b.target) sigInst.neighbors[a == b.target ? b.source : b.target] = n;
       b.hidden = !1, b.attr.color = "rgba(0, 0, 0, 1)";
    });
    var f = [];
    sigInst.iterNodes(function (a) {
        a.hidden = !0;
        a.attr.lineWidth = !1;
        a.attr.color = a.color
    });
    
    if (groupByDirection) {
		//SAH - Compute intersection for mutual and remove these from incoming/outgoing
		for (e in outgoing) {
			//name=outgoing[e];
			if (e in incoming) {
				mutual[e]=outgoing[e];
				delete incoming[e];
				delete outgoing[e];
			}
		}
    }
    
    var createList=function(c) {
        var f = [];
    	var e = [],
      	 	 //c = sigInst.neighbors,
       		 g;
    for (g in c) {
        var d = sigInst._core.graph.nodesIndex[g];
        d.hidden = !1;
        d.attr.lineWidth = !1;
        d.attr.color = c[g].colour;
        a != g && e.push({
            id: g,
            name: d.label,
            group: (c[g].name)? c[g].name:"",
            colour: c[g].colour
        })
    }
    e.sort(function (a, b) {
        var c = a.group.toLowerCase(),
            d = b.group.toLowerCase(),
            e = a.name.toLowerCase(),
            f = b.name.toLowerCase();
        return c != d ? c < d ? -1 : c > d ? 1 : 0 : e < f ? -1 : e > f ? 1 : 0
    });
    d = "";
		for (g in e) {
			c = e[g];
			/*if (c.group != d) {
				d = c.group;
				f.push('<li class="cf" rel="' + c.color + '"><div class=""></div><div class="">' + d + "</div></li>");
			}*/
			// f.push('<li class="membership"><a href="#' + c.name + '" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + c.id + '\'])\" onclick=\"nodeActive(\'' + c.id + '\')" onmouseout="sigInst.refresh()">' + c.name + "</a></li>");
            f.push('<li class="membership"><a href="#' + c.name + '" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + c.id + '\'])\" onclick=\"clicked_node_inPanel(\'' + c.id + '\')" onmouseout="sigInst.refresh()">' + c.name + "</a></li>");
		}
		return f;
	}
	
	/*console.log("mutual:");
	console.log(mutual);
	console.log("incoming:");
	console.log(incoming);
	console.log("outgoing:");
	console.log(outgoing);*/
	
	
	var f=[];
	
	//console.log("neighbors:");
	//console.log(sigInst.neighbors);

	if (groupByDirection) {
		size=Object.size(mutual);
		f.push("<h2>Mututal (" + size + ")</h2>");
		(size>0)? f=f.concat(createList(mutual)) : f.push("No mutual links<br>");
		size=Object.size(incoming);
		f.push("<h2>Incoming (" + size + ")</h2>");
		(size>0)? f=f.concat(createList(incoming)) : f.push("No incoming links<br>");
		size=Object.size(outgoing);
		f.push("<h2>Outgoing (" + size + ")</h2>");
		(size>0)? f=f.concat(createList(outgoing)) : f.push("No outgoing links<br>");
	} else {
		f=f.concat(createList(sigInst.neighbors));
	}
	//b is object of active node -- SAH
    b.hidden = !1;
    b.attr.color = b.color;
    b.attr.lineWidth = 6;
    b.attr.strokeStyle = "#000000";
    sigInst.draw(2, 2, 2, 2);

    $GP.info_link.find("ul").html(f.join(""));
    $GP.info_link.find("li").each(function () {
        var a = $(this),
            b = a.attr("rel");
    });
    f = b.attr;
    if (f.attributes) {
        e = [];
        //temp_array = [];
        g = 0;
        for (var attr in f.attributes) {
            var d = f.attributes[attr],
                h = "";
            if(attr=="school"){
            	h = '<span><strong>School :</strong> ' + d + '</span><br/><br/>'
            }
            else if(attr=="provider"){
            	h = '<span><strong>subject :</strong> ' + d + '</span><br/><br/>'
            }
            else if(attr=="Modularity Class"){
            	h = '<span><strong>Modularity Class :</strong> ' + d + '</span><br/><br/>'
            }
            else if(attr=="category"){
            	h = '<span><strong>대분류 :</strong> ' + d + '</span><br/><br/>'
            }
            else if(attr=="treat"){
            	h = '<span><strong>진료과 :</strong> ' + d + '</span><br/><br/>'
            }
            else if(attr=="drug"){
            	h = '<span><strong>의약품 :</strong> ' + d + '</span><br/><br/>'
            }
            else{}
            //temp_array.push(f.attributes[g].attr);
            //h = '<span><strong>' + attr + ':</strong> ' + d + '</span><br/>'           
            e.push(h)
        }

        //패널 이름 붙이기
       	$GP.info_name.html("<div><span onmouseover=\"sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex['" + b.id + '\'])" onmouseout="sigInst.refresh()">' + b.label + "</span></div>");

        // Image field for attribute pane
       	$GP.info_data.html(e.join(" "))



        var schools_html = [];   // this array is for just show text, not d3 chart
        var selected_Keyword = [];   // this array is for d3. chart
        

        keyword_map.forEach(function (node){
            
            if(a == node.node_id){
                console.log(node.keywords);
                selected_Keyword = node.keywords;
                
            }
        }); 

        // $GP.info_relatedSchool.html("<div>" + schools_html + "</div>");

        // console.log(selected_School);
        console.log(selected_Keyword);
                
        
        // if(plotFlag == false){
        drawPlot(selected_Keyword);
        // drawPlotSubject(selected_Subject);


    }
    $GP.info_data.show();
    $GP.info_p.html("Connections:");
    $GP.info.animate({width:'show'},350);
	$GP.info_donnees.hide();
	$GP.info_donnees.show();
    sigInst.active = a;
    window.location.hash = b.label;
}


function drawPlot(dataset){
    // console.log(dataset);
    

    // cuz jquery and d3 duplication of selection ? I put this condition 
    if(plotFlag == true){

        d3.select("#keywordPlot").html("");
        
        console.log("remove plot and draw again!");

    }else{
        plotFlag = true;
        console.log("draw plot!");
    }
    

    var keyword_name = [];
    var value_arr = [];

    for(i=0; i<dataset.length; i++){
        keyword_name.push(dataset[i].keyword);
        value_arr.push(dataset[i].value);
    }


    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<strong> TF-IDF:</strong> <span style='color:red'>" + d.value + "</span>";
      })
    

    var svg_keyword = d3.select("#keywordPlot").append("svg")
                    .attr("width", w + margin.left + margin.right)
                    .attr("height", h + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg_keyword.call(tip);

    x.domain(keyword_name);
    y.domain([0, d3.max(value_arr, function(d) { return d; })]);

    svg_keyword.append("text")
        .attr("x", (w/2))
        .attr("y", 0 - (margin.top /2 ))
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text("Related Keywords");

    svg_keyword.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + h + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d){
            return "rotate(-65)"
        });

    svg_keyword.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("TF-IDF value");

    svg_keyword.selectAll(".bar")
        .data(dataset)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) {return x(d.keyword); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) {return y(d.value); })
        .attr("height", function(d) {return h - y(d.value); })
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);
        

}

function showCluster(a) {

    console.log("when click one cluster...(showCluster function operates)");


    var b = sigInst.clusters[a];
    if (b && 0 < b.length) {
        showGroups(!1);
        sigInst.detail = !0;
        b.sort();
        sigInst.iterEdges(function (a) {
            // console.log(a);
            a.hidden = !1;
            a.attr.lineWidth = !1;
            a.attr.color = !1
        });
        sigInst.iterNodes(function (a) {
            a.hidden = !0
        });
        for (var f = [], e = [], c = 0, g = b.length; c < g; c++) {
            var d = sigInst._core.graph.nodesIndex[b[c]];
            !0 == d.hidden && (e.push(b[c]), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#'+d.label+'" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"nodeActive('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))
        }
        sigInst.clusters[a] = e;
        sigInst.draw(2, 2, 2, 2);
        $GP.info_name.html("<b>" + a + "</b>");
        $GP.info_data.hide();
        $GP.info_p.html("Group Members:");
        $GP.info_link.find("ul").html(f.join(""));
        $GP.info.animate({width:'show'},350);
        $GP.search.clean();
		$GP.cluster.hide();
        return !0
    }
    return !1
}

// need to change the function as polymorphism
function showProvider(a) {

    console.log("when click one subject...(showProvider function operates)");

    var b = sigInst.providers[a];
    if (b && 0 < b.length) {
        showGroups(!1);
        sigInst.detail = !0;
        b.sort();
        sigInst.iterEdges(function (a) {
            a.hidden = !1;
            a.attr.lineWidth = !1;
            a.attr.color = !1
        });
        sigInst.iterNodes(function (a) {
            a.hidden = !0
        });
        for (var f = [], e = [], c = 0, g = b.length; c < g; c++) {
            var d = sigInst._core.graph.nodesIndex[b[c]];
            !0 == d.hidden && (e.push(b[c]), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#'+d.label+'" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"nodeActive('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))
        }
        sigInst.providers[a] = e;
        sigInst.draw(2, 2, 2, 2);
        $GP.info_name.html("<b>" + a + "</b>");
        $GP.info_data.hide();
        $GP.info_p.html("Group Members:");
        $GP.info_link.find("ul").html(f.join(""));
        $GP.info.animate({width:'show'},350);
        $GP.search.clean();
        $GP.provider.hide();
        return !0
    }
    return !1
}

function showSchool(a) {

    console.log("when click one subject...(showProvider function operates)");

    var b = sigInst.schools[a];
    if (b && 0 < b.length) {
        showGroups(!1);
        sigInst.detail = !0;
        b.sort();
        sigInst.iterEdges(function (a) {
            a.hidden = !1;
            a.attr.lineWidth = !1;
            a.attr.color = !1
        });
        sigInst.iterNodes(function (a) {
            a.hidden = !0
        });
        for (var f = [], e = [], c = 0, g = b.length; c < g; c++) {
            var d = sigInst._core.graph.nodesIndex[b[c]];
            !0 == d.hidden && (e.push(b[c]), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#'+d.label+'" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"nodeActive('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))
        }
        sigInst.schools[a] = e;
        sigInst.draw(2, 2, 2, 2);
        $GP.info_name.html("<b>" + a + "</b>");
        $GP.info_data.hide();
        $GP.info_p.html("Group Members:");
        $GP.info_link.find("ul").html(f.join(""));
        $GP.info.animate({width:'show'},350);
        $GP.search.clean();
        $GP.subject.hide();
        return !0
    }
    return !1
}



// for parallel Coordinates
function parallelSynced(actived_elements){
    d3.select("#keywordPlot").html("");
    console.log("activate nodes when the brush in PC is operated");
    /*
    actived_elements.forEach(function(e){
        console.log(e.node_id);
    })
*/
    // var b = sigInst.clusters[a];

    showGroups(!1);

    sigInst.detail = !0;
    // b.sort();

    // 모든 edge, node를 비활?성화
    sigInst.iterEdges(function (a) {
        a.hidden = !1;
        a.attr.lineWidth = !1;
        a.attr.color = !1
    });
    sigInst.iterNodes(function (a) {
        a.hidden = !0
    });
    for (var f = [], e = [], c = 0, g = actived_elements.length ; c < g; c++) {
        var d = sigInst._core.graph.nodesIndex[actived_elements[c].node_id];
        if(d != null){
            // !0 == d.hidden && (e.push(actived_elements[c].node_id), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#'+d.label+'" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"nodeActive('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))    
            !0 == d.hidden && (e.push(actived_elements[c].node_id), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#'+d.label+'" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"clicked_node_inPanel('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))    
        }
        
    }
    //sigInst.clusters[a] = e;
    sigInst.draw(2, 2, 2, 2);
    //$GP.info_name.html("<b>" + a + "</b>");
    $GP.info_data.hide();
    $GP.info_p.html("Group Members:");
    $GP.info_link.find("ul").html(f.join(""));
    $GP.info.animate({width:'show'},350);
    $GP.search.clean();
    $GP.cluster.hide();
    return !0

    return !1


}


