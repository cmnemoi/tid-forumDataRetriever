// ==UserScript==
// @name         ForumDataRetriever
// @version      2.2.0
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
var startCountdown = 5000;
var nPages = 250;

window.onload = function () {
    var currId = 0;
    var ids = [];
    var threads = "";
    var data = '{\n"topics": [{\n\t';

    var pageNumber = 1;
    var pageCount = 0;
    var counter = 0;

    var e = document.getElementById("tid_forum_right");

    function check() {
        if (_tid.forum.urlLeft.indexOf("?p=") == -1) _tid.forum.loadLeft(_tid.forum.urlLeft+"?p=1");

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
                var postContent = document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_parsed")[1].innerHTML;
                postContent = postContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\u{2028}|\u{2029}/gu, '').replace(/\r\n/g,'<br />').replace(/\n/g,'\\n');
                commentCount++;

                data += commentCount == 1 ? '\n\t\t{\n\t\t\t' : ',\n\t\t{\n\t\t\t';
                data += '"scanDate":'+postScanDate+',\n\t\t\t';
                data += '"authorID":'+postAuthor+',\n\t\t\t';
                data += '"id":'+commentID+',\n\t\t\t';
                data += '"date":"'+postDate+'",\n\t\t\t';
                data += '"content":"'+postContent+'"\n\t\t';
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
                        counter++;console.log(counter);
                        if (nPages == pageCount) {
                            console.log(data+'\n\t}\n]}');
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

setTimeout(check, startCountdown);
}