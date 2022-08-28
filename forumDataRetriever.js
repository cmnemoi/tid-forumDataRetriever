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


// PARAMETERS
var startCountdown = 3000;
var nPages = undefined;
var mainDisplay = 'askToShowInterface';

function startFDR(v1) {
    var currId = 0;
    var ids = [];
    var threads = "";
    var data = '{\n"topics": [{\n\t';

    var pageNumber = 1;
    var pageCount = 0;
    var counter = 0;

    var e = document.getElementById("tid_forum_right");
    nPages = v1;

    function check() {
        if (nPages == undefined) nPages = parseInt(document.getElementById("fdr-nPages").value);
        if (isNaN(nPages)) { console.log("[ForumDataRetriever] nPages is NaN."); return; }
        if (_tid.forum.urlLeft.indexOf("?p=") == -1) _tid.forum.loadLeft(_tid.forum.urlLeft+"?p=1");

        console.log("[ForumDataRetriever] Start : " + nPages);
        updateStatus("Pages fetched : " + pageCount + " (Max : " + nPages + ")");

        threads = document.getElementsByClassName("tid_thread tid_threadLink");
        ids = [];

        for (var i = 0; i < threads.length; i++) {
            var attr = threads[i].getAttribute("id");
            ids.push(attr.split("_")[2]);
        }
        currId = 0;
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
        obs2.observe(e, { childList: true });
        _tid.forum.loadRight("thread/"+ids[currId]+"?p=1", { side : "R"});
    }

    // Cycle through threads
    function check2() {
        var topicName = document.querySelectorAll("#tid_forum_right .tid_title")[0].innerHTML.trim();
        var commentCount = 0;
        topicName = topicName.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g,'').replace(/\t/g,'');
        data += '"name":"'+topicName+'",\n\t';
        data += '"id":'+ids[currId]+',\n\t';

        // Cycle through posts
        data += '"comments":[';
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

                data += commentCount == 1 ? '\n\t\t{\n\t\t\t' : ',\n\t\t{\n\t\t\t';
                data += '"scanDate":'+postScanDate+',\n\t\t\t';
                data += '"authorID":'+postAuthor+',\n\t\t\t';
                data += '"id":'+commentID+',\n\t\t\t';
                data += '"date":"'+postDate+'",\n\t\t\t';
                data += '"content":"'+postContent+'",\n\t\t\t';
                data += '"contentWarning":' + (postWarning == undefined ? 'null' : '"'+postWarning+'"') + '\n\t\t';
                data += "}";
            }

            if (isNaN(nextPage)) {
                data += '],\n\t"pages":'+pageNumber+',';
                data += '\n\t"commentsCount":'+commentCount;
                pageNumber = 1;
                if (++currId == ids.length) {
                    var nextTopicPage = document.querySelectorAll("#tid_forum_left .tid_actionBar .tid_next a")[0];
                    if (nextTopicPage !== undefined && nextTopicPage.toString().split("=")[1] !== undefined) {
                        pageCount++;
                        nextTopicPage = nextTopicPage.toString().split("=")[1].split("|")[0];
                        updateStatus("Pages fetched : " + pageCount + " (Max : " + nPages + ")");

                        if (nPages == pageCount) {
                            console.log(data+'\n\t}\n]}');
                            updateStatus("Pages fetched : " + pageCount + ". Result is logged into console.");
                            return;
                        }
                        data += '\n\t},\n\t{\n\t';

                        var e2 = document.getElementById("tid_forum_left");
                        var cbc1 = function(mutList, observer) {
                            for(var mutation of mutList) {
                                if (mutation.type == 'childList') {
                                    var node = mutation.removedNodes[0];
                                    if (node !== undefined && node.className === "tid_loading") {
                                        observer.disconnect();
                                        check();
                                    }}}}
                        var obs1 = new MutationObserver(cbc1);
                        obs1.observe(e2, { childList: true });
                        _tid.forum.loadLeft(_tid.forum.urlLeft.split("?")[0]+"?p="+nextTopicPage);
                    }
                    else {
                        data += '\n\t}\n]}';
                        console.log(data);
                        updateStatus("Pages fetched : " + pageCount + ". Result is logged into console.");
                    }
                    return;
                };
                data += '\n\t},\n\t{\n\t';

                var cbc2 = function(mutList, observer) {
                    for(var mutation of mutList) {
                        if (mutation.type == 'childList') {
                            var node = mutation.removedNodes[0];
                            if (node !== undefined && node.className === "tid_loading") {
                                observer.disconnect();
                                check2();
                            }}}}
                var obs2 = new MutationObserver(cbc2);
                obs2.observe(e, { childList: true });
                _tid.forum.loadRight("thread/"+ids[currId]+"?p=1");
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
                obs3.observe(e, { childList: true });
                _tid.forum.loadRight("thread/"+ids[currId]+"?p="+nextPage);
            }
        }
        check3();
    }

    check();
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
                    <label for="fdr-nPages" style="font-size:16px">Pages : </label>
                    <input type="number" id="fdr-nPages" name="fdr-nPages" min="1" default="1" style="width:50px">
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
    <p id="fdr-main" style="margin:auto;text-align:center;"><a href="javascrip:void(0)" id="fdr-a">Show ForumDataRetriever Interface</a> </p>`.trim();
    var node = template.content.firstChild;
    var e = document.getElementById("content");
    e.insertBefore(node,e.children[0]);
}