## 对虚拟DOM和DOM-Diff的简单理解

## 一、前言
随着前端框架比如Vue和React的不断发展，虚拟DOM和DOM-Diff也随着这些框架被越来越多的人重视。在学习和面试的过程中，越来越成为我们无法回避的知识点。面试时经常会被问到：了解虚拟DOM吗？知道Vue和React的虚拟DOM是什么样的吗？知道他们的DOM-Diff是如何实现的吗？如果你没有认真去看过他们的源码，可能会一问三不知。但是去看源码对一些新手又会觉得有点困难，而且难以理解。**因此，我的一贯的思想是，如果你想要熟练掌握一个东西，最好的方式就是去实现一个简单的这种东西。**<br>
在我之前的文章中，我想要学习webpack，那么我就手动[实现一个简易的模块打包器](https://juejin.cn/post/6893809205183479822)。我想了解`loader`，那么我就手动去制作了一个loader[由浅及深实现一个loader](https://juejin.cn/post/6903856764018982925)。通过这些简单地实现，可以帮助我们很好地去理解这个东西，这样的话你再去看源码就会觉得轻松很多，毕竟底层原理是相同的，可能更多的是实现细节的优化。<br>
因此，**本文的学习重点是虚拟DOM以及DOM-Diff，那么我们就会实现一个简单的虚拟DOM和DOM-Diff**。注意，本文的实现过程跟Vue或者React的实现不一定相同，是参考了网上的一些文章，以及个人的理解，是为了尽可能地帮助大家理解，所以实现过程可能不是最优。

## 二、对虚拟DOM的一些基础知识的理解
### 2.1 什么是虚拟DOM？
对于虚拟DOM可能很多没有了解过的人会觉得很高大上，不知道是个什么东西，事实上虚拟DOM是相对于真实DOM来进行阐述的。我们都知道一个真实的DOM就是我们常写的html，如下如所示：
```html
    <div id="test">
        <p class = "item">节点1</p>
        <span class = "item">节点2</span>
    </div>
```
而虚拟DOM就是一个js对象，用来描述真实的DOM，它可能是长这样：
```javascript
const vNode = {
    tag:"div",//标签名或者组件名
    data:{
        id:"test",
    },
    children:[
        {tag:"p",data:{className:"item"},children:"节点1"},
        {tag:"span",data:{className:"item"},children:"节点2"}
    ]
}
```
我们可以看到上面通过一个`vNode`对象来描述我们之前的真实DOM,这个对象就是虚拟DOM,对象里面的字段比如tag用来描述标签名称，data用来描述标签上的属性，children用来描述标签上的子元素。在Vue和React中不同的虚拟DOM，可能有不同的字段来描述，但是他们的功能都是为了描述真实DOM。**也就是说虚拟DOM是一个对象，它是用来描述真实DOM**。大家牢记这句话即可。

### 2.2为什么需要虚拟DOM？
很多人可能会奇怪，既然已经有了真实DOM，那么为什么还需要虚拟DOM了？万事万物，凡存在即合理。虚拟DOM的存在肯定是因为它带来了好处，相对应的也就是说真实DOM存在一些问题。这里我们参考网上一些常见的原因。

#### 2.2.1 操作真实DOM性能开销大

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\2.1真实DOM开销大.jpg)

如上图所示，我们可以看到一个简单的div元素，它身上的属性都非常庞大。当需要操作的DOM非常多，且操作非常频繁时，触发浏览器的渲染。由于浏览器的渲染涉及到：创建DOM树，创建CSSOM树，创建render树，布局和绘制这些流程。当频繁操作DOM时，会频繁地进行渲染，这样的话可能会带来性能和用户体验上的影响。因此，我们希望能够尽可能地去减少DOM的操作。而虚拟DOM的目的就是为了减少真实DOM的频繁操作。那么虚拟DOM就一定能够减少真实DOM的操作吗？或者换句话说虚拟DOM就一定会比真实DOM快吗？这是不一定的。比如说同样是创建10个元素，如果是真实DOM，直接创建10个元素，如果是虚拟DOM，最终还是需要渲染10个元素，反而还增加了虚拟DOM的创建时间，以及虚拟DOM-Diff时间，可能最终耗时反而比真实DOM更长。那么什么情况下使用虚拟DOM能够比使用真实DOM可能更快了。在以下两种情况下，虚拟DOM能够减少真实DOM的操作。

#### 2.2.2 虚拟DOM减少DOM操作的两种情况

1. **虚拟DOM合并多次操作**
当我们需要进行多次DOM操作时，比如第一次修改样式宽度，第二次修改样式高度，第三次修改位置。如果是真实的DOM，那么每修改一次就会触发一次渲染，影响性能。但是虚拟DOM可以合并这几次操作，将所有的样式修改合并到一起修改，这样的话就相当于只修改了一次DOM，触发一次渲染。

2. **虚拟DOM可以减少操作范围**
当我们需要更新100个节点时，虚拟DOM可以通过DOM Diff发现只有10个需要更新，这样的话就只需要操作10个即可。从而减少操作DOM的范围。

### 2.3 虚拟DOM组成

在2.1节中，我们知道了虚拟DOM是一个对象，对象的一个一个属性用来描述虚拟DOM，而且不同的虚拟DOM其属性也不同，但是最终他们渲染出来的真实DOM确是一致的，这说明虚拟DOM有其固定的组成。我们看下React和Vue中虚拟DOM的组成，然后分析出他的一些必不可缺的组成部分。

**React**

```javascript
const vNode = {
    type:"div",         // 标签名或者组件名
    key:null,
    props:{             // 属性
        children:[      // 子元素或者子组件
            {type:"span",...},
            {type:"div",...},
        ],
        className:"wrapper",
        onClick:() => {}
    },
    ref:null,
    ...
}
```

**Vue**

```javascript
const vNode = {
    tag:"div",          //标签名或者组件名
    data:{              // 属性
        class:"wrapper",
        on:{
            click:() => {}
        }
    },
    children:[          // 子元素或者子组件
        {tag:"span",...},
        {tag:"div",...},
    ],
    ...
}
```

通过上面的对比，无论是React还是Vue中虚拟DOM的组成都肯定包含三个部分：

1. **type/tag：元素类型**
2. **props/data：元素属性**
3. **children：子元素集合**

事实上，这也是描述一个真实DOM所不可或缺的三部分。type用来描述DOM的类型，是一个普通元素还是组件，

props用来描述这个元素身上的属性比如常见的style，class以及事件等，而children用来描述这个元素内部包裹的子元素。只有这三个都存在，才能够完整地描述一个元素。因此，我们知道了，一个虚拟DOM它至少应该是下面这种形式：

```javascript
const vNode = {
    tag:"div",
    data:{
        id:"test",
        class:"item"
    },
    children:[
        {tag:"span",data:{},children:"span1"}
    ]
}
```

知道了虚拟DOM的具体组成，那么接下来我们就需要知道如何去创建虚拟DOM了。

## 三、创建虚拟DOM

### 3.1 实现createElement函数创建虚拟DOM

通过上面的分析，我们已经知道了什么是虚拟DOM，为什么使用虚拟DOM以及虚拟DOM的组成。接下来我们就需要实现一个虚拟DOM。也就是说我们需要知道如何去生成虚拟DOM。事实上，创建虚拟DOM实际就是去创建一个如下的js对象。

```javascript
 {
    tag:"div",
    data:{
        id:"test",
        class:"item"
    },
    children:[
        {tag:"span",data:{},children:"span1"}
    ]
}
```

想要创建虚拟DOM，那么需要借助函数来实现，我们需要一个函数`createElement`能够返回上面的数据，如下如所示：

```javascript
function createElement(tag,data,children){
    return {
        tag,
        data,
        children
    }
}
```

这是一个最简单的生成vNode的函数，我们使用这个函数来生成下面真实DOM的vNode。

```html
    <div id="test">
        <p class = "item"></p>
    </div>
```

通过createElement生成对应的vNode

```javascript
    var vNode = createElement("div",{id:"test"},[
        createElement("p",{class:"item"},"p1")
    ])
    console.log(JSON.stringify(str,null,2))
```

查看得到的结果是：

```javascript
{
  "tag": "div",
  "data": {
    "id": "test"
  },
  "children": [
    {
      "tag": "p",
      "data": {
        "class": "item"
      },
      "children": "p1"
    }
  ]
}
```

通过上面的最简单的createElement将必传的三个参数传进去，然后返回一个js对象就得到了我们对应的vNode。但是上面的createElement太过于简单了，对于传进来的参数我们没有经过任何处理而是直接返回了。但是事实上我们可以发现，每次其实tag和children是应该有所区别的。其中tag它既可能是普通的html标签，可能是文本也可能是组件，而且我们上面发现children可能是一个数组，也可能是一个字符串。对于这些不同之处我们需要进行一下标记。这样的话方便我们之后进行处理。

这里我们将tag分为四种类型：**HTML、TEXT、COMPONENT和CLASS_COMPONENT**

```javascript
const vNodeTypes = {
    HTML: "HTML",
    TEXT: "TEXT",
    COMPONENT: "COMPONENT",
    CLASS_COMPONENT: "CLASS_COMPONENT"
}
let vNodeType;
if (typeof tag === "string") {
    //元素是一个普通的html标签
    vNodeType = vNodeTypes.HTML;
} else if (typeof tag === "function") {
    vNodeType = vNodeTypes.COMPONENT
} else {
    vNodeType = vNodeTypes.TEXT
}
```

同理我们将children分为三种类型：没有子元素则children为空，子元素为字符串，说明是子元素是一个文本，以及多个子元素的情况。

```javascript
const childTypes = {
    EMPTY: "EMPTY",
    SINGLE: "SINGLE",
    MULTIPLE: "MULTIPLE"
}
let childType;
if(children === null){
    childType = childTypes.EMPTY;
}else if(Array.isArray(children)){
    if(children.length === 0){
        childType = childTypes.EMPTY;
    }else if(children.length >=1 ){
        childType = childTypes.MULTIPLY;
    }
}else{
    childType = childTypes.SINGLE;
    children = createTextVNode(children + "")  // 这里我们对文本类型的children进行了处理
}
```

这样的话，我么那就得到了一个比较完整的createElement函数去实现创建虚拟DOM。代码如下：

```javascript
// 创建虚拟DOM函数
const vNodeTypes = {
    HTML: "HTML",
    TEXT: "TEXT",
    COMPONENT: "COMPONENT",
    CLASS_COMPONENT: "CLASS_COMPONENT"
}
const childTypes = {
    EMPTY: "EMPTY",
    SINGLE: "SINGLE",
    MULTIPLE: "MULTIPLE"
}

function createElement(tag, data, children) {
    // 处理不同的节点类型tag 
    let vNodeType;
    if (typeof tag === "string") {
        //元素是一个普通的html标签
        vNodeType = vNodeTypes.HTML;
    } else if (typeof tag === "function") {
        vNodeType = vNodeTypes.COMPONENT
    } else {
        vNodeType = vNodeTypes.TEXT
    }
    
    // 处理不同的children类型
    let childType;
    if (children === null) {
        childType = childTypes.EMPTY;
    } else if (Array.isArray(children)) {
        if (children.length === 0) {
            childType = childTypes.EMPTY;
        } else if (children.length >= 1) {
            childType = childTypes.MULTIPLE;
            console.log("childType:", childType)
        }
    } else {
        childType = childTypes.SINGLE;
        children = createTextVNode(children + "")
    }

    return {
        tag,
        vNodeType,
        data,
        children,
        childType
    }
}
// 文本的children，直接处理下
function createTextVNode(text) {
    return {
        vNodeType: vNodeTypes.TEXT,
        tag: null,
        data: null,
        children: text,
        childType: childTypes.EMPTY
    }
}
```

### 3.2 将虚拟DOM挂载到真实的DOM上去

我们得到了虚拟DOM，但是这是一个js对象啊，我们还需要通过它生成真实的DOM，然后挂载到DOM上去。我们在vue或者react中常常见到如下代码：

```
<div id = "root"></div>
new Vue({
  el: "#root",
  render: (h) => h(app),
});
```

其实，上面代码就是将虚拟DOM挂载到id为root的节点上去。我们接下来就需要实现一个`render`函数，将vNode能够渲染到指定的节点上去。对于挂载的处理，我们需要考虑vNodeType和childType。如果vNodeType是TEXT文本类型，那么它children为空，不需要再考虑他的children。而如果是HTML类型，那么还需要考虑它的childType。不同的childType进行不同的处理。

![render](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\render.jpg)

对于挂载节点，我们最常用的方法就是`document.createElement()`和`document.createTextNode`。后者用于创建文本节点。然后通过`appendChild`方法挂载到指定的节点下。

```javascript
function render(vNode, container) {
    // render实现的功能就是挂载
    mount(vNode, container);
}
// 挂载
function mount(vNode, container) {
    const {  vNodeType } = vNode;
    // 不同的节点，有不同的挂载方式。文本节点单独处理
    if (vNodeType == vNodeTypes.HTML) {
        mountElement(vNode, container);
    } else if (vNodeType === vNodeTypes.TEXT) {
        mountText(vNode, container);
    }
}
```

接下来我们需要分别实现挂载文本的`mountText`方法和挂载HTML标签的`mountElement`。

**mountText**

```javascript
function mountText(vNode, container) {
    let dom = document.createTextNode(vNode.children);
    vNode.el = dom;
    container.appendChild(dom);
}
```

**mountElement**

```javascript
function mountElement(vNode, container) {
    const { tag, childType,  children} = vNode;
    const dom = document.createElement(tag);
    vNode.el = dom;
    if (childType === childTypes.SINGLE) {
        mount(vNode.children, dom)
    } else if (childType === childTypes.MULTIPLE) {
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            mount(child, dom);
        }
    }
    container.appendChild(dom);
}
```

接下来我们使用这个render函数，然后定义一个节点进行挂载：

```javascript
    <div id="app"></div>
    <script src = "./index.js"></script>
    <script>
        var vNode = createElement("div",{id:"test"},[
            createElement("p",{key:"a",style:{color:"red",background:"green"}},"节点1"),
            createElement("p",{key:"d"},"节点4"),
            createElement("p",{key:"b",class:"item"},"节点2"),
        ]);
        // console.log(JSON.stringify(vNode,null,2))
        render(vNode,document.getElementById("app"));   // 挂载到app上
    </script>
```

然后查看一下最终的结果，

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\3-mount.jpg)

我们可以发现成功地实现了元素挂载搭配id为app的元素下面，并且展示到了页面中。

### 3.3 将虚拟DOM的data中属性渲染到DOM上

在上一节中，我们已经能够实现将虚拟DOM挂载到指定的DOM上去，但是对于虚拟DOM上的属性我们还没有进行处理，我们可以发现DOM上实际上应该还有一些id属性，style样式或者class类名等。这些也需要进行处理。

我们首先需要再`mountElement`中遍历data中的属性，然后针对每种属性进行不同的处理。

```javascript
function mountElement(vNode, container) {
    ...
    
    // 处理data中的属性
    if (data) {
        for (let key in data) {
            // 节点，名字，老值，新值.
            patchData(dom, key, null, data[key])
        }
    }
    //  ... 挂载children
    if (childType === childTypes.SINGLE) {
        mount(vNode.children, dom)
    } else if (childType === childTypes.MULTIPLE) {
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            mount(child, dom);
        }
    }
    container.appendChild(dom);
}
```

接下来就是针对不同的属性，比如style它是一个对象，class是一个字符串，事件是@开头等，不同属性有不同的处理方式，也就是说我们关键是去实现`patchData`方法。这里只是简单考虑，我们只处理了style和class属性，其他属性的处理方式相似。

```javascript
function patchData(el,key,oldValue,newValue){
  switch(key){
      // 处理style
      case "style":
          if(newValue){
              for(let key in newValue){
                  el.style[key] = newValue[key];
              }
          }
          if(oldValue){
            if (newValue && !newValue.hasOwnProperty(k)) {
                el.style[k] = "";
            }
          }
          break;
      // 处理class
      case "class":
          el.className = newValue;
          break;
      case "default":
          el.setAttribute(key, newValue);
          break;
  }
}
```

接下来我们查看一下，vNode中属性和元素是否都挂载成功了。

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\4-patchData.jpg)



我们在DOM中可以看到style和class都成功添加上了，而且属性在页面中也成功生效了。**也就是说到目前为止，我们已经实现了创建虚拟DOM和挂载虚拟DOM这两个关键步骤了。**通过以上的步骤我们基本上对于虚拟DOM已经有了全面，深入的了解了。接下来就是考虑当再次渲染时，如何对虚拟DOM进行DOM-Diff从而进一步优化性能。
























