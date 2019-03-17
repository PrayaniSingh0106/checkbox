var esprima =  require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");
var path = require( "path" );

function main(fileNameArr)
{
    var filePath = fileNameArr;
	console.log(`filePath in main` + filePath)
	complexity(filePath);

	// Report
	for( var node in builders )
	{
		var builder = builders[node];
		builder.report();
	}
    
}

 var builders = {};
 var maxFunctionLength = 0;

 function FunctionBuilder()
 {
     this.StartLine = 0;
     this.FunctionName = "";
     // The number of parameters for functions
     this.ParameterCount  = 0,
     // Number of if statements/loops + 1
     this.SimpleCyclomaticComplexity = 0;
     // The max depth of scopes (nested ifs, loops, etc)
     this.MaxNestingDepth    = 0;
     // The max number of conditions if one decision statement.
     this.NumConditions = 0;
     this.MaxConditions  = 0;
     this.FunctionLength = 0;
 
     this.report = function()
     {
         console.log(
            (
                "{0}(): {1}\n" +
                "============\n" +
                "SimpleCyclomaticComplexity: {2}\t" +
                 "MaxNestingDepth: {3}\t" +
                 "MaxConditions: {4}\t" +
                 "Parameters: {5}\n\n"+
                 "FunctionLength: {6}"
             )
             .format(this.FunctionName, this.StartLine,
                      this.SimpleCyclomaticComplexity, this.MaxNestingDepth,
                     this.MaxConditions, this.ParameterCount, this.FunctionLength)
         );
     }
 };
 

 function FileBuilder()
{
	this.FileName = "";
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;
    this.functionLength = 0;

	this.report = function()
	{
		console.log (
			( "{0}\n" +
			  "~~~~~~~~~~~~\n"+
              "Strings {1}\n"+
              "functionLength {2}\n"
			).format( this.FileName, this.Strings, this.functionLength ));
	}
}

function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object); 

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            //console.log(`child is : ${child}`)
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
					traverseWithParents(child, visitor);
            }
        }
    }
}

function getMaxCondition(child){
   
    if(child==null){
        console.log(`returning child null`);
        return 0;
    }
    res = 1;
    if(child.type=="LogicalExpression"){
        res = res + getMaxCondition(child.left) ;
        res = res + getMaxCondition(child.right);
    }
    return res;

}


function complexity(filePath)
{
	console.log(`filePath  ${filePath}`);
	var buf = fs.readFileSync(filePath, "utf8");
	console.log(`buf  ${buf}`);
	
	var ast = esprima.parse(buf, options);

	var i = 0;

	// A file level-builder:
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
    fileBuilder.ImportCount = 0;
    fileBuilder.functionLength = 0;
    
	builders[filePath] = fileBuilder;

	// Tranverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{
		if (node.type === 'FunctionDeclaration' || node.type == 'FunctionExpression') 
		{
            var builder = new FunctionBuilder();
			//count of function length
            builder.FunctionLength = 0;
            builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			//count of parameters
			builder.ParameterCount = node.params.length;
            builder.MaxConditions = 0;
			builder.NumConditions = 0;

            //method length to calculate long method
			builder.FunctionLength = node.loc.end.line - node.loc.start.line + 1;
			
			if(builder.FunctionLength > 100){
				console.log(`Long method!`);
			}
				//New code, we can also check isDecision() if truee, then wil calculate for other loops like while also
			traverseWithParents(node, function(child)
			{
				if(isDecision(child))
				{
                    builder.SimpleCyclomaticComplexity++;
                    
                     if(child.test){
						 builder.NumConditions = Math.floor(getMaxCondition(child.test)/2) +1;
						}
						if(child.consequent){
							builder.NumConditions += Math.floor(getMaxCondition(child.test)/2);
						}
				}
				if(builder.NumConditions > builder.MaxConditions){
					builder.MaxConditions = builder.NumConditions;
					console.log(`builder.MaxConditions  : ${builder.MaxConditions }`)
				}
			});

			
		builder.SimpleCyclomaticComplexity++;
        
        //Max function length
        // if(node.body.type == 'BlockStatement'){
            
        console.log(`builder.FunctionLength: ${builder.FunctionLength}`);
        if(builder.FunctionLength > maxFunctionLength)
            maxFunctionLength = builder.FunctionLength;
       		builders[builder.FunctionName] = builder;
        }
        
		//new code String count
		if(node.type=="Literal" && typeof(node.value)=='string'){

			//console.log("Count of strings: ");
			fileBuilder.Strings++;
		}
		
	});

	
}

// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "anon function @" + node.loc.start.line;
}


// Helper function for allowing parameterized formatting of strings.
if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }

module.exports = {main:main};