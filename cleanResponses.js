var filename;
var leavingCat=-1
var data
var words
var cols
$(function() {
	$('#csvUpload').on('change', function(e){
		$('#jsonUpload').val("")
		var file = this.files[0];
		filename=file.name
		var papa = Papa.parse(file, {
			complete: function(results) {
			data = results.data;
			localStorage.setItem("data", JSON.stringify(data)); 
			localStorage.setItem("filename", filename); 
			localStorage.removeItem('words') 
			localStorage.removeItem('cols')
			$("#categories").html('')
			$("#words").html('')
			
			showCols(data);
			}
		});
	});
	$('#jsonUpload').on('change', function(e){
		$('#csvUpload').val("")
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = function(readerEvent) {
			var json=JSON.parse(readerEvent.target.result)
			data = json.data;
			localStorage.setItem("data", JSON.stringify(data)); 
			filename=json.filename
			localStorage.setItem("filename", filename); 
			words = json.words;
			localStorage.setItem("words", JSON.stringify(words)); 
			cols = json.cols;
			localStorage.setItem("cols", JSON.stringify(cols)); 
			showCols(data,cols)
			showWords()
		}
		reader.readAsText(file);
	});
	$(".sort").click(sortwords)
	$("#dosave").click(dosave)
	if(localStorage.getItem('data')!=null) {
		data=JSON.parse(localStorage.getItem('data'))
		words=JSON.parse(localStorage.getItem('words'))
		cols=JSON.parse(localStorage.getItem('cols'))
		filename=localStorage.getItem('filename')
		showCols(data,cols)
		showWords()
	}
})
function dosave() {
	updatewords()
	var filetype=$('input[name="filetype"]:checked').val()
	var fn  = filename.replace(/(-edited)?\.csv$/,'-edited.'+filetype)
	$("#savemodal").modal('hide')
	switch(filetype) {
		case "json":
			download(fn,"json",JSON.stringify({words:words,data:data,cols:cols}))
			break;
		case "csv":
			var extent=$('input[name="extent"]:checked').val()
			var editdata=data
			var editcols=cols
			if(extent=="part") {
				editdata=editdata.map(function(x) {
					var a=[]; 
					for(c of editcols) {
						a.push(x[c])
					}
					return a
				})
				// Reset col numbers to 0...n
				for(i=0;i<editcols.length;i++) editcols[i]=i
			}
			var keepcols=$('input[name="keepcols"]:checked').val()
			if(keepcols=="keep") {
				editdata=editdata.map(function(x) {
					for(i=0;i<editcols.length;i++)  {
						var col=editcols[i]+i
						x.splice(col,0,x[col])
					}
					return x
				})
				// increase col numbers by 1..n and update headers
				for(i=0;i<editcols.length;i++) {
					editcols[i]+=i+1
					editdata[0][editcols[i]]+="-edited"
				}
			}
			// Update values
			var editdata=editdata.map(function(x,i) {
				if(i>0) { // Don't update header row
					for(c of editcols) {
						if(x[c]!="" && typeof(words[x[c]])!="undefined" && words[x[c]].category!="")
							x[c]=words[x[c]].category
					}
				}
				return x
			})
			download(fn, "csv", Papa.unparse(editdata, {
				quotes: true, //or array of booleans
				quoteChar: '"',
				escapeChar: '"',
				delimiter: ";",
				header: true,
				newline: "\r\n",
				skipEmptyLines: false, //or 'greedy',
			}));
		break;
	}
	
}
function download(filename,filetype, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/'+filetype+';charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}
function updatewords() {
	$(".word").each(function() { 
		var word=$(this).find(".name").text()
		var cat=$(this).prevAll(".category")
		var category=""
		if(cat.length>0) category=cat.first().find(".name").text()
		words[word].category=category
	})
	localStorage.setItem("words", JSON.stringify(words)); 
}
function sortwords() {
	var sorttype=$(this).data("sorttype")
	var sortdirection=$(this).data("sortdirection")
	$(this).data("sortdirection",sortdirection==1?-1:1)
	var neworder=$("#words .word").sort(function(a,b) {
		switch(sorttype) {
			case "alpha": 
				return sortdirection*$(a).find(".name").text().localeCompare($(b).find(".name").text())
				break
			case "num":
				var an=Number($(a).find(".num").text())
				var bn=Number($(b).find(".num").text())
				return sortdirection*(an>bn?1:an<bn?-1:0)
		}
	})
	$("#words").html(neworder)
}
function showCols(data,selectedcols=[]) {
	// List all unique answers ordered alphabetically
	var list=""
	for(var i=0;i<data[0].length;i++) {
		list+='<span class="colname'+(selectedcols.indexOf(i)>-1?' selectedcol':'')+'">'+data[0][i]+'</span> '
	}
	$("#collist").html(list)
	$(".colname").click(function() {
		$(this).toggleClass("selectedcol")
		cols=$(".selectedcol").map(function() {return $(this).index()}).get()
		localStorage.setItem("cols", JSON.stringify(cols)); 

		buildList()
	})
}
function buildList() {
	// List all unique answers ordered alphabetically
	words={}
	for(var r=1;r<data.length;r++) {
		for(var c of cols) {
			if(typeof(data[r][c])!="undefined" && data[r][c].trim()!="") {
				var word=data[r][c].trim()
				if(typeof(words[word])=="undefined") words[word]={instances:1,category:""}
				words[word].instances+=1
			}
		}
	}
	localStorage.setItem("words", JSON.stringify(words)); 
	showWords()
}
function showWords() {
	// Reset categories
	$("#categories").html('<dt class="category newcategory">New Category</dt><dd id="lastph">+</dd>')
	var list=""
	for(var w in words) {
		var word='<dd class="word"><span class="name">'+w+'</span> (<span class="num">'+words[w].instances+'</span>)'+'</dd>'
		var wordelem=$(word)
		var cat=words[w].category
		if(cat!="") {
			var dt=$("dt").filter(function(){ return $(this).find(".name").text() === cat})
			if(dt.length==0) {
				var dt=$(".newcategory").clone()
				dt.removeClass("newcategory")
				dt.html(wordelem.html())
				dt.find(".name").attr("contenteditable",true)
				dt.prependTo("#categories")
			}
			dt.after(wordelem)
			updatesum(wordelem)
		} else list+=word
	}
	$("#words").html(list)
	// This takes a long time when words has been saved in localStorage - but not when it is loaded from csv. Doesn't make sense!
	$("#words").sortable({
		connectWith:"#categories",
		placeholder: "ui-state-highlight",
		stop: dropped
	}).disableSelection();
	$("#categories").sortable({
		connectWith:"#categories,#words",
		placeholder: "ui-state-highlight",
		items: "> dd",
		stop: dropped,
		start: started
	}).disableSelection();
	$(".word").on("dblclick",addword)
}
function addword() {
	var word=$(this)
	var dt=$(".newcategory").clone()
	dt.removeClass("newcategory")
	dt.html(word.html())
	dt.find(".name").attr("contenteditable",true)
	dt.appendTo("#categories")
	dt.after(word)
	updatesum(word)
	$(".newcategory").appendTo("#categories")
	$("#lastph").appendTo("#categories")
}
function started(event,ui) {
	var item=$(ui.item)
	leavingCat=item.prevAll(".category").index() // First previous category
}
function dropped(event,ui) {
	var word=$(ui.item)
	if(word.prev().length==0 || word.prev().text()=="New Category" || word.prev().attr("id")=="lastph") {
		var newcat=$(".newcategory").clone()
		newcat.removeClass("newcategory")
		word.before(newcat)
		newcat.html(word.html())
		newcat.find(".name").attr("contenteditable",true)
		$(".newcategory").appendTo("#categories")
		$("#lastph").appendTo("#categories")
	} else { // update number of members
		updatesum(word)
	}
	if(leavingCat>-1) {
		var word=$($("#categories").children().get(leavingCat)).next(".word")
		if(word.length==0) { // No children. Remove.
			$($("#categories").children().get(leavingCat)).remove()
		} else updatesum(word)
		leavingCat=-1
	}
	updatewords()
}
function updatesum(word) {
	var cat=word.prevAll(".category").index() // First previous category
	var last=word.nextAll(".category").index() // Last previous category
	var members=0
	for(var i=cat+1;i<last;i++) members+=Number($($("#categories").children().get(i)).find(".num").text())
	$($("#categories").children().get(cat)).find(".num").text(members)

}
