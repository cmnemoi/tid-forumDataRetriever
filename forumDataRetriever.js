// ==UserScript==
// @name         ForumDataRetriever
// @version      3.0.0
// @description  Retrieve twinoid forums data into JSON Format
// @author       Sanart
// @updateURL   https://raw.githubusercontent.com/Sanart99/tid-forumDataRetriever/master/forumDataRetriever.js
// @downloadURL https://raw.githubusercontent.com/Sanart99/tid-forumDataRetriever/master/forumDataRetriever.js
// @include  https://twinoid.com/tid/forum*
// @include https://twinoid.com/fr/tid/forum*
// @include http://www.hordes.fr/tid/forum*
// @include http://www.die2nite.com/tid/forum*
// @include http://www.dieverdammten.de/tid/forum*
// @include http://www.zombinoia.com/tid/forum*
// ==/UserScript==

var maxPages = undefined;
var mainDisplay = 'askToShowInterface';

function startFDR(nPages) {
    var threadElements = undefined;
    var threadIDs = [];
    var currID = 0;

    var jsonData = '{\n"topics": [{\n\t';

    var pageNumber = 1;
    var pageCount = 0;

    var forumRElement = document.getElementById("tid_forum_right");
    maxPages = nPages;

    function scanThreads() {
        if (maxPages == undefined) maxPages = parseInt(document.getElementById("fdr-maxPages").value);
        if (isNaN(maxPages)) { console.log("[ForumDataRetriever] maxPages is NaN."); return; }
        if (_tid.forum.urlLeft.indexOf("?p=") == -1) _tid.forum.loadLeft(_tid.forum.urlLeft+"?p=1");

        updateStatus("Pages fetched : " + pageCount + " (Max : " + maxPages + ")");

        threadElements = document.getElementsByClassName("tid_thread tid_threadLink");
        threadIDs = [];

        for (var i = 0; i < threadElements.length; i++) {
            var attr = threadElements[i].getAttribute("id");
            threadIDs.push(attr.split("_")[2]);
        }
        currID = 0;
        pageNumber = 1;

        var cbc2 = function(mutList, observer) {
            for(var mutation of mutList) {
                if (mutation.type == 'childList') {
                    var node = mutation.removedNodes[0];
                    if (node !== undefined && node.className === "tid_loading") {
                        observer.disconnect();
                        check2();
                    }}}}
        var obs2 = new MutationObserver(cbc2);
        obs2.observe(forumRElement, { childList: true });
        _tid.forum.loadRight("thread/"+threadIDs[currID]+"?p=1", { side : "R"});
    }

    // Cycle through threads
    function check2() {
        var topicName = document.querySelectorAll("#tid_forum_right .tid_title")[0].innerHTML.trim();
        var commentCount = 0;
        topicName = topicName.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g,'').replace(/\t/g,'');
        jsonData += '"name":"'+topicName+'",\n\t';
        jsonData += '"id":'+threadIDs[currID]+',\n\t';

        // Cycle through posts
        jsonData += '"comments":[';
        function check3() {
            var pagePosts = document.getElementsByClassName("tid_post");

            var nextPage = document.querySelectorAll("#tid_forum_right .tid_mainBar .tid_next a")[0];
            if (nextPage !== undefined) nextPage = nextPage.toString().split("=")[2];

            for (var i = 0; i < pagePosts.length; i++) {
                var commentID = parseInt(pagePosts[i].id.substr(14));
                if (document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_name a")[0] === undefined) {
                    continue;
                }
                var postScanDate = Date.now();
                var postAuthor = document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_name a")[0].toString().split("/")[5];
                var postDate = document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_date")[0].innerHTML;
                var res = document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_editorContent");
                var postContent = res[0].innerHTML;
                var postWarning = res[1] == undefined ? undefined : res[1].innerHTML;
                postContent = postContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\u{2028}|\u{2029}/gu, '').replace(/\r\n/g,'<br />').replace(/\n/g,'\\n');
                if (postWarning != undefined)
                    postWarning = postWarning.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\u{2028}|\u{2029}/gu, '').replace(/\r\n/g,'<br />').replace(/\n/g,'\\n'); // replaces copypasted
                commentCount++;

                jsonData += commentCount == 1 ? '\n\t\t{\n\t\t\t' : ',\n\t\t{\n\t\t\t';
                jsonData += '"scanDate":'+postScanDate+',\n\t\t\t';
                jsonData += '"authorID":'+postAuthor+',\n\t\t\t';
                jsonData += '"id":'+commentID+',\n\t\t\t';
                jsonData += '"date":"'+postDate+'",\n\t\t\t';
                jsonData += '"content":"'+postContent+'",\n\t\t\t';
                jsonData += '"contentWarning":' + (postWarning == undefined ? 'null' : '"'+postWarning+'"') + '\n\t\t';
                jsonData += "}";
            }

            if (isNaN(nextPage)) {
                jsonData += '],\n\t"pages":'+pageNumber+',';
                jsonData += '\n\t"commentsCount":'+commentCount;
                pageNumber = 1;
                if (++currID == threadIDs.length) {
                    var nextTopicPage = document.querySelectorAll("#tid_forum_left .tid_actionBar .tid_next a")[0];
                    if (nextTopicPage !== undefined && nextTopicPage.toString().split("=")[1] !== undefined) {
                        pageCount++;
                        nextTopicPage = nextTopicPage.toString().split("=")[1].split("|")[0];
                        updateStatus("Pages fetched : " + pageCount + " (Max : " + maxPages + ")");

                        if (maxPages == pageCount) {
                            console.log(jsonData+'\n\t}\n]}');
                            updateStatus("Pages fetched : " + pageCount + ". Result is logged into console.");
                            return;
                        }
                        jsonData += '\n\t},\n\t{\n\t';

                        var e2 = document.getElementById("tid_forum_left");
                        var cbc1 = function(mutList, observer) {
                            for(var mutation of mutList) {
                                if (mutation.type == 'childList') {
                                    var node = mutation.removedNodes[0];
                                    if (node !== undefined && node.className === "tid_loading") {
                                        observer.disconnect();
                                        scanThreads();
                                    }}}}
                        var obs1 = new MutationObserver(cbc1);
                        obs1.observe(e2, { childList: true });
                        _tid.forum.loadLeft(_tid.forum.urlLeft.split("?")[0]+"?p="+nextTopicPage);
                    }
                    else {
                        jsonData += '\n\t}\n]}';
                        console.log(jsonData);
                        updateStatus("Pages fetched : " + pageCount + ". Result is logged into console.");
                    }
                    return;
                };
                jsonData += '\n\t},\n\t{\n\t';

                var cbc2 = function(mutList, observer) {
                    for(var mutation of mutList) {
                        if (mutation.type == 'childList') {
                            var node = mutation.removedNodes[0];
                            if (node !== undefined && node.className === "tid_loading") {
                                observer.disconnect();
                                check2();
                            }}}}
                var obs2 = new MutationObserver(cbc2);
                obs2.observe(forumRElement, { childList: true });
                _tid.forum.loadRight("thread/"+threadIDs[currID]+"?p=1");
            }
            else {
                pageNumber++;

                var cbc3 = function(mutList, observer) {
                    for(var mutation of mutList) {
                        if (mutation.type == 'childList') {
                            var node = mutation.removedNodes[0];
                            if (node !== undefined && node.className === "tid_loading") {
                                observer.disconnect();
                                check3();
                            }}}}
                var obs3 = new MutationObserver(cbc3);
                obs3.observe(forumRElement, { childList: true });
                _tid.forum.loadRight("thread/"+threadIDs[currID]+"?p="+nextPage);
            }
        }
        check3();
    }

    scanThreads();
}

var fdrMainElement = undefined;

function switchMainDisplayToStatus() {
    fdrMainElement = document.getElementById("fdr-main");
    fdrMainElement.innerHTML = "Pages fetched : 0";
    mainDisplay = "status";
}

function updateStatus(msg) {
    if (mainDisplay != "status" || fdrMainElement == undefined) return;
    fdrMainElement.innerHTML = msg;
}

window.onload = function () {
    document.addEventListener('click', function (e) {
        if (e.target == document.getElementById("fdr-go")) {
            switchMainDisplayToStatus();
            startFDR();
        }
        else if (e.target == document.getElementById("fdr-a") && document.getElementById("fdr-interface") == undefined) {
            addFDRInterface();
        }
        ;
    });

    function addFDRInterface() {
        var template = document.createElement('template');
        template.innerHTML = `
        <div class="tid_mainBar" id="fdr-interface">
            <div class="tid_stack tid_bg4">
                <span class="tid_title">ForumDataRetriever</span>
            </div>
                
            <div class="tid_actionBar tid_bg4">
                <form>
                    <label for="fdr-maxPages" style="font-size:16px">Pages : </label>
                    <input type="number" id="fdr-maxPages" name="fdr-maxPages" min="1" default="1" style="width:50px">
                </form>
                <div class="tid_buttonBar">
                    <a href="javascript:void(0)" id="fdr-go">Go</a>
                </div>
            </div>
        </div>`.trim();
        var node = template.content.firstChild;
        var e = document.querySelector("#tid_forum_left .tid_forumThreads");
        e.insertBefore(node, e.children[1]);
    }

    var template = document.createElement('template');
    template.innerHTML = `
    <p id="fdr-main" style="margin:auto;text-align:center;"><a href="javascript:void(0)" id="fdr-a">Show ForumDataRetriever Interface</a> </p>`.trim();
    var node = template.content.firstChild;
    var e = document.getElementById("content");
    e.insertBefore(node,e.children[0]);
}