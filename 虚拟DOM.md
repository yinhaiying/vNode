# 虚拟DOM
## DOM操作慢？虚拟DOM快？
DOM操作慢是对比于JS原生API,如原生的一些数组操作。
任何基于DOM的库(Vue/React)都不可能在操作DOM时比DOM快(因为这些库在操作DOM时也是使用DOM进行操作，而不是使用JS原生API)。
那为什么普遍觉得虚拟DOM比真实DOM快？
因为在某些情况下，虚拟DOM快。

- 虚拟DOM可以减少DOM操作
1、虚拟DOM可以将多次DOM操作合并为一次操作。比如添加100个节点，如果是真实DOM需要一个一个地操作，但是虚拟DOM可以将这100次操作合并成一次操作。
2、虚拟DOM可以减少操作范围。比如添加100个节点，虚拟DOM可以通过比较发现只有10个节点是新增的，这样的话就可以只操作这10个节点即可。
- 跨平台
因为虚拟DOM本质上只是一个JS对象。虚拟DOM不仅可以变成DOM，还可以变成小程序、ios应用，安卓应用。
**React的虚拟DOM**
```javascript

const vNode = {
    key:null,
    props:{
        children:[  // 子元素
            {type:"span",...},
            {type:"div",...},
        ],
        className:"wrapper",
        onClick:() => {}
    },
    ref:null,
    type:"div",   // 标签名或者组件名
    ...
}
```
**Vue的虚拟DOM**
```javascript
const vNode = {
    tag:"div",//标签名或者组件名
    data:{
        class:"wrapper",
        on:{
            click:() => {}
        }
    },
    children:[
        {tag:"span",...},
        {tag:"div",...},
    ],
    ...
}
```

## 如何创建虚拟DOM
React中得到虚拟DOM
```javascript
createElement("div",{className:"wrapper", onClick:() => {}},[
    createElement("span",{},"span1"),
    createElement("div",{},"div1"),
])
```
Vue中得到虚拟DOM(vue只能在render函数里面得到h)
```javascript
h("div",{
    class:"wrapper",
    on:{
        click:() => {}
    }
},[
    h("span",{},"span1"),
    h("div",{},"div1"),
])
```
但是，用上面这种写法来写代码无疑是变得很复杂，而且难以理解。因此，React和Vue都提供了相应的办法来进行优化，React中使用JSX来简化，而Vue中使用vue-loader来简化。
React中的JSX转化上面的代码：
```javascript
<div className="wrapper" onClick = "{()=>{}}">
  <span>span1</span>
  <div>div1</div>
</div>
```
如上所示：jsx简化了createElement方法，直接将其写成html标签形式，里面的属性作为标签的属性。子元素同样当做html标签进行描述。这样的话就跟我们写普通的HTML一样了，只是需要注意一些特殊之处，比如`onClick = "{()=>{}}"`这种如果直接写成`onClick = "()=>{}"`，会由于Html不支持这种语法而报错，因此需要特殊处理一下，加上`{}`，表示这是react语法即可。
同理Vue中，使用`vue-loader`来简化这种虚拟DOM的写法，通过在`template`当成html来写。
```javascript
<div class = "wrapper" @click = "fn">
  <span>span1</span>
  <div>div1</div>
</div>
```
只不过vue自定义了更多的处理，比如v-bind,v-on这些指令来进行操作,多了更多vue的语法罢了。

## 总结：
什么是虚拟DOM？
一个能够表示DOM树的对象，通常含有标签名，标签上的属性，监听事件和子元素们，以及其他属性。
虚拟DOM有什么优点？
- 能够减少DOM操作
- 能够跨平台渲染

虚拟DOM有什么缺点？
需要额外的创建函数来创建虚拟DOM，比如createElement或者h，但可以通过jsx来简化成XML写法。


## DOM  diff
虚拟DOM的对比算法
DOM diff就是一个函数，我们称之为patch
patches=patch(oldVNode,newVNode)；
patches就是要运行的DOM操作，可能长这样;
```javascript
[
    {type:"INSERT",vNode:{}},
    {type:"TEXT",vNode:{}},
    {type:"PROPS",vNode:{}},
]
```

## DOM diff的大概逻辑
- Tree diff
将新旧两颗树逐层对比，找出哪些节点需要更新
如果节点是组件，就看Component diff
如果节点是标签，就看element diff

- Component diff
如果节点是组件，就先看组件类型
类型不同，直接替换(删除旧的)
类型相同，则只更新属性
然后深入组件做Tree diff(递归)

- Element diff
如果节点是原生标签，则看标签名
标签名不同则直接替换，相同则只更新属性
然后进入标签后做 Tree diff(递归)