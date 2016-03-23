process.stdin.resume();

process.on('message', function(data){
	console.log('****Forking now*****')
	console.log("CHILD: received " + data + "from parent.");
	var rgb = makeRGB();
	process.send(rgb.toString());
})

process.on('WebSocket closed.', function(){
	console.log('Received kill command from parent. :(... Why me?')
});

function makeRGB(){
	function randColor (){
		return (Math.random() * 255).toFixed(0);
	}

	return [randColor(), randColor(), randColor()];
}	