const tags = ["PCG"]
	
function purge(world) {
    let prev_actors = world.GetAllActorsOfClassAndTags(StaticMeshActor, tags).OutActors  
    prev_actors.forEach((actor) => world.EditorDestroyActor(actor))  
}
    
function generate_spiral(world, opts) {
    const mesh = opts.mesh
    const mtrl = opts.mtrl
    
    let N = opts.N || 10
    let num_spirals = opts.num_spirals || 5
    let radius = opts.radius || 200
    let height = opts.height || 200 * 5
    purge(world)		
    for (let i = 0; i < N; ++i) {
        let v = i / N
        let u = v * num_spirals * 2 * Math.PI
        let t = {
            Translation: {
                X: Math.sin(u) * radius,
                Y: Math.cos(u) * radius,
                Z: v * height
            }
        }
        let color = {
            R: t.Translation.X * 2 + 1,
            G: t.Translation.Y * 2 + 1,
            B: v, 
            A: 1
        } 
        let mi = world.CreateDynamicMaterialInstance(mtrl)
        mi.SetVectorParameterValue('color', color)
        let sma = StaticMeshActor.C(world.BeginSpawningActorFromClass(StaticMeshActor, t, true))
        sma.StaticMeshComponent.StaticMesh = mesh			
        sma.StaticMeshComponent.SetMaterial(0, mi)
        sma.StaticMeshComponent.ReregisterComponent()
        sma.FinishSpawningActor(t)
        sma.Tags = tags
    }
}

function get_engine() {
    return Root.GetEngine()
}

function get_world() {
    return get_engine().GetEditorWorld()
}

function redraw() {
    get_engine().RedrawAllViewports(true)
}
    
function generate(data) {
    generate_spiral(get_world(), data)
    redraw()
}

function clear() {
    purge(get_world())
    redraw()
}    

function main() {
    let UMG = require('UMG')
	let instantiator = require('instantiator')
	
	let schema = {
		"title": "SpiralMetaData",
		"type": "object",
		"properties": {
            "desc" : {
                "type" : "string"  
            },
            "mesh" : {
                "type" : "StaticMesh",
            },
            "mtrl" : {
                "type" : "Material",
            },
			"N" : {
				"type" : "integer",
			},
			"height" : {
				"type" : "float",
			},
			"num_spirals" : {
				"type" : "integer",
			},
			"radius" : {
				"type" : "float"
			},
            "test" : {
                "type" : "array",
                "items" : {
                    "title": "TestStruct",
                    "type": "object",
                    "struct": "true",
                    "properties": {
                        "A": {
                            "type" : "integer"                            
                        },
                        "B": {
                            "type" : "string"                            
                        }
                    }   
                }                
            }
		},
		"required" : [ "N", "height", "num_spirals", "radius" ]
	}
	
    let json2u = require('./json2u')()	
	let meta = json2u.create('spiral',schema)
    
    let previewWorld
    function gen() {
        let data = new meta()
        data.num_spirals = 10;
        data.radius = Math.random() * 300 + 100; 
        data.N = 100;
        data.height = Math.random() * 800 + 200
        data.mesh = StaticMesh.Load('/Engine/BasicShapes/Sphere')
        data.mtrl = Material.Load('/Game/Color.Color')
        data.desc = Math.random().toString(16)
        return data
    }
    let data = gen()
    
    let GEngine = Root.GetEngine()    
    const buttonTextStyle = {
        Font : {
            FontObject : GEngine.SmallFont,
            Size : 10
        },
        ColorAndOpacity : {
            SpecifiedColor:{R:0,G:0,B:0,A:1}
        }
    }
    let spin    
    let viewport
    function preview() {
        purge(previewWorld)
        generate_spiral(previewWorld, data)
        viewport.Redraw()
    }
    function tick() {
        if (--spin > 0) {
            process.nextTick(tick)
        } else {
            spin = null
            preview()
        }
    }
    function touch() {
        if (!spin) {
            process.nextTick(tick)
        }
        spin = 10        
    }
    let listeners = []
    let viewportDesign = 
        UMG(JavascriptEditorViewport,
        {
            $link:elem => {
                viewport = JavascriptEditorViewport.C(elem)
                process.nextTick(__ => {                    
                    previewWorld = viewport.GetViewportWorld()
                    generate_spiral(previewWorld, data)                      
                })  
                elem.updateData = _ => {
                    purge(previewWorld)
                    generate_spiral(previewWorld, data)
                    redraw()
                }
                listeners.push(elem)
            },            
            $unlink:elem => {
                listeners.splice(listeners.indexOf(elem),1)
            }
        },
            UMG.text(
                {
                    Font : {
                        FontObject : GEngine.SmallFont,
                        Size : 7
                    },
                },
                "SPIRAL GENERATOR PREVIEW"
            )
        )
    let editorDesign = 
        UMG.div({},
            UMG.span({},
                UMG(Button,
                    {
                        OnClicked:_ => generate(data),
                        ToolTipText:'Generate spirals on editor world'
                    },
                    UMG.text(buttonTextStyle,"Generate!!")
                ),
                UMG(Button,
                    {
                        OnClicked:clear,
                        ToolTipText:'Purge last created spirals'
                    },
                    UMG.text(buttonTextStyle,"Purge")
                )
            ),
            UMG(PropertyEditor,
            {            
                'slot.size.size-rule':'Fill',
                OnChange: _ => {
                    touch()
                },
                $link:elem => {
                    elem.SetObject(data)
                    elem.updateData = _ => {
                        elem.SetObject(data)
                    }
                    listeners.push(elem)
                },
                $unlink:elem => {
                    listeners.splice(listeners.indexOf(elem),1)
                }
            })        		
        )
    
    let _ = require('lodash')
    let browserDesign = 
    UMG(JavascriptListView,
    {
        ItemHeight: 20,
        OnGenerateRowEvent: item => {
            let design = 
                UMG.text(
                    {
                        Font : {
                            FontObject : GEngine.SmallFont,
                            Size : 10
                        }
                    },
                    item.desc
                )
            return instantiator(design)
        },
        $link:elem => {
            console.log('link up!')
            elem.JavascriptContext = Context
            elem.proxy = {
                OnSelectionChanged: item => {
                    data = item
                    listeners.forEach(listener => listener.updateData())  
                },
            }
            elem.Items = _.range(10).map(gen)
        }
    }
    )
    
    function makeTab(id,design) {
        let tabs = global[id] = []
        var tab = new JavascriptEditorTab
        tab.TabId = id
        tab.Role = 'MajorTab'
        tab.DisplayName = 'Inner'
        tab.OnSpawnTab = _ => {
            let widget = instantiator(design)
            tabs.push(widget)
            return widget
        }
        tab.OnCloseTab = tab => {
            tabs.splice(tbas.indexOf(tab),1)
        }
        return tab
    }
    
    function browserTab() {
        return makeTab('TestBrowserTab',browserDesign)        
    } 
    
    function viewportTab() {
        return makeTab('TestInnerTabViewport',viewportDesign)        
    }
    
    function editorTab() {
        return makeTab('TestInnerTab',editorDesign)        
    }        
	
    let tabManager = new JavascriptEditorTabManager(JavascriptLibrary.CreatePackage(null,'/Script/Javascript'))
    tabManager.Tabs = [editorTab(),viewportTab(),browserTab()]
    tabManager.Layout = JSON.stringify({
        Type:'Layout',
        Name:'TestLayout',
        PrimaryAreaIndex: 0,
        Areas: [
            {
                Type: 'Area',
                Orientation: 'Orient_Horizontal',
                WindowPlacement: 'Placement_NoWindow',
                Nodes: [
                    {
                        Type: 'Stack',
                        SizeCoefficient : 0.3,
                        HideTabWell: 'true',
                        Tabs: [
                            {                                
                                TabId: 'TestBrowserTab',
                                TabState: 'OpenedTab'  
                            }
                        ]
                    },
                    {
                        Type: 'Splitter',
                        Orientation: 'Orient_Vertical',
                        SizeCoefficient : 0.7,
                        Nodes : [
                            {
                                Type: 'Stack',
                                SizeCoefficient : 0.5,
                                HideTabWell: 'true',
                                Tabs: [
                                    {                                
                                        TabId: 'TestInnerTabViewport',
                                        TabState: 'OpenedTab'  
                                    }
                                ]
                            },
                            {
                                Type: 'Stack',
                                SizeCoefficient : 0.5,
                                HideTabWell: 'true',
                                Tabs: [
                                    {                                
                                        TabId: 'TestInnerTab',
                                        TabState: 'OpenedTab'  
                                    }
                                ]
                            }        
                        ]
                    }                                        
                ]
            }
        ]
    })
        
    let menu = new JavascriptEditorMenu
    menu.OnHook = name => {
        if (name == 'Menubar') {
            menu.AddPullDownMenu('Test','TestMenu','TestMenutoolip');    
        } else if (name == 'Test') {
            JavascriptUIExtender.BeginSection('Test','Test')
            JavascriptUIExtender.AddMenuEntry(global.$commands,'Test');
            JavascriptUIExtender.AddMenuSeparator()
            JavascriptUIExtender.EndSection('Test','Test')
        }
    }
    
    return instantiator(
        UMG.div(
            {
                $link:elem => {
                    elem.AddChild(menu)
                    elem.AddChild(tabManager).Size.SizeRule = 'Fill'  
                }
            }
        )
    )
}

module.exports = function () {
	let maker = require('editor-maker')

	let opts = {
		DisplayName: "SpiralGenerator",
		TabId: "SpiralGenerator@"
	}
    
    let commands = global.$commands = maker.commands({
        commands : {
            Test : {
                name : 'test menu',
                execute : _ => {
                    //@FIX
                    console.log('test!')
                },
                query : _ => {
                    //@FIX
                    console.log("QUERY")
                    true
                }
            }
        }
    }) 
    commands.Commit()
    
	maker.tabSpawner(opts,main);
	
	return _ => {
        commands.Discard()
    }
}
