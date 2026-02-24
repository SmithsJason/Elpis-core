<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="utf-8">
  <link href="/static/normalize.css" rel="stylesheet">
  <link href="/static/logo.png" rel="icon" type="image/x-icon">
<script defer src="http://127.0.0.1:9002/public/dist/dev/js/runtime~entry.entry.page1_f63c35c1.bundle.js"></script><script defer src="http://127.0.0.1:9002/public/dist/dev/js/vendors_a5a7cac3.bundle.js"></script><script defer src="http://127.0.0.1:9002/public/dist/dev/js/entry.entry.page1_85528b14.bundle.js"></script></head>
<body style="margin:0">
 <div id="root"></div>
 <input id="env" value="{{ env }}" style="display: none;">
 <input id="options" value="{{ options }}" style="display: none;">
</body>
<script type="text/javascript">
  try{
    window.env=document.getElementById('env').value;
    const options =document.getElementById('options').value;
    window.options=JSON.parse(options);
  }
  catch(e){
    console.log(e);
  }
</script>
</html>
