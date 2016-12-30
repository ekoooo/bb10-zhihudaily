cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.blackberry.ui.dialog/www/client.js",
        "id": "com.blackberry.ui.dialog.client",
        "clobbers": [
            "blackberry.ui.dialog"
        ]
    },
    {
        "file": "plugins/com.blackberry.app/www/client.js",
        "id": "com.blackberry.app.client",
        "clobbers": [
            "blackberry.app"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.blackberry.ui.dialog": "1.0.0",
    "com.blackberry.app": "1.0.0"
}
// BOTTOM OF METADATA
});