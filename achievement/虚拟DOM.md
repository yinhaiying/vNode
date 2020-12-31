## 由浅及深实现虚拟DOM和DOM-Diff

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

## 三、虚拟DOM的创建和渲染

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
function patchData(el, key, oldValue, newValue) {
  switch (key) {
    case "style":
      if (newValue) {
        for (let k in newValue) {
          el.style[k] = newValue[k];
        }
      }
      if (oldValue) {
        for (let k in oldValue) {
          if (newValue && !newValue.hasOwnProperty(k)) {
            el.style[k] = "";
          }
        }
      }
      break;
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



## 四、DOM-Diff

### 4.1 什么是DOM-Diff？

DOM-Diff从字面上可以理解就是比较两个DOM数的差异。我们在之前的章节中讲述过**虚拟DOM减少DOM操作的两种情况**

1. **虚拟DOM合并多次操作**
2. **虚拟DOM可以减少操作范围**

这两种情况的实现都需要对DOM树进行比较，记录比较的差异，然后应用到所构建的真正的DOM树上，也就是需要通过**DOM-Diff**来实现。既然两个树之间需要进行比较，那么肯定需要有比较的规则，**其中最核心的规则就是同层比较**。

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\6-dom-diff的规则.png)

如上图所示，两个DOM树在DOM Diff算法中只会对同一层级的元素进行比较。既然是同级元素进行比较，那么需要比较哪些内容了。**我们知道虚拟DOM核心主要包括节点类型tag，节点属性data以及子元素children。而比较的实际上就是这三部分，节点是否发生变化了，属性是否发生变化了，子节点是否发生了变化，包括文本类型的子节点内容发生变化，子节点数量发生了变化(增加和删除)，子节点位置发生了变化**。根据这些分析，其大致有有以下几种情况：

1. **节点类型变了**。比如vNodeType从HTML类型变成了TEXT类型。直接写在旧节点然后装载新节点。
2. **节点类型一样，仅仅是属性或者属性值变了**。不会触发节点的卸载和装载，而是触发节点属性的更新。
3. **文本变了**。由于文本的变化不涉及到节点的卸载和装载，直接替换文本即可。
4. **增加/删除/移动了子节点**。这种情况就存在优化的地方了，如果暴力实现就是卸载所有旧的节点，然后直接装载所有新的节点，但是这样的话就没有涉及到DOM Diff了，这种效率非常低下。思考一下，如果我们每次给虚拟DOM的元素一个特定的key值，它能够更具key值，直接找到具体的位置，如果存在说明不是新增或者删除节点，如果位置发生了移动，那么只需要考虑移动到新的位置即可。这样的话无疑效率要高效很多。



### 4.2 DOM-Diff的实现

#### 4.2.1 区分首次渲染和非首次渲染

我们要实现DOM-DIff，那么首先需要知道什么情况下会使用DOM-Diff。事实上既然需要比较，那么肯定是元素已经被渲染过至少一次了，也就是说我们需要区分一下首次渲染和再次渲染，只有再次渲染的时候才触发DOM-Diff。因此，我们需要修改一下render函数。

```javascript
function render(vNode, container) {
    if(container.vNode){
        // 说明不是首次渲染
        patch(container.vNode,vNode,container);
    }else{
        mount(vNode, container);
    }
    // 每次渲染完成之后都把vNode挂载到container身上
    container.vNode = vNode;
}
```

我们通过将vNode挂载到container身上，当下次渲染时，如果这个vNode存在，说明不是首次渲染，那么就需要进行DOM-Diff，也就是要执行`patch`，因此我们接下来的重点就是实现`patch`方法。

#### 4.2.2 实现patch方法

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\5-DOM-Diff的整个流程.jpg)

在上面我们提到过DOM-Diff的内容的集中情况，主要是节点类型，属性和子元素。接下来我们就按照这种思路一步一步地进行处理。注意：出于简单处理考虑，我们这里不会处理组件类型的节点。

**一、节点类型变了。比如vNodeType从HTML类型变成了TEXT类型。不需要比较，直接卸载旧节点然后挂载新节点。**

```javascript
function patch(oldVNode,newVNode,container){
   const oldVNodeType = oldVNode.vNodeType;
   const newVNodeType = newVNode.vNodeType;
   if(oldVNodeType !== newVNodeType){
       replaceVNode(oldVNode, newVNode,container);
   }
}
// 删除旧节点，然后挂载新节点
function replaceVNode(oldVNode, newVNode, container) {
  container.removeChild(oldVNode.el);
  mount(newVNode,container)
}
```

**二、节点类型没变，需要处理属性data和children子元素。由于节点类型又包括HTML类型和TEXT文本类型，因此都需要单独做处理。**

```javascript
function patch(oldVNode,newVNode,container){
   const oldVNodeType = oldVNode.vNodeType;
   const newVNodeType = newVNode.vNodeType;
   if(oldVNodeType !== newVNodeType){
       replaceVNode(oldVNode, newVNode,container);
   } else{
       // 标签相同情况下的处理
       if(newVNodeType === vNodeTypes.HTML){
           // 标签为HTML的情况下的处理
           patchElement(oldVNode, newVNode, container)
       }else if(newVNodeType === vNodeTypes.TEXT){
           // 标签为TEXT的情况下的处理
           patchText(oldVNode,newVNode,container)
       }
   }
}
```

如上所示，我们整个patch函数的处理逻辑就是vNodeType节点类型不同就直接替换。如果节点类型相同，就根据节点分别做处理。这里处于简单考虑，为了避免变得复杂，我们只是简单处理节点类型为HTML和TEXT的节点，不处理节点为COMPONENT和CLASS_COMPONENT类型的节点。因此，我们接下来就是去实现`patchText`和`patchElement`函数。<br>

#### 4.2.3 TEXT类型的虚拟DOM的比较

**patchText方法的实现**<br/>

**文本类型的标签生成的虚拟DOM是如下形式：**

```javascript
{
  "tag": null,
  "vNodeType": "TEXT",
  "data": {},
  "children": "文本1",
  "childType": "SINGLE"
}
```

也就是说它的tag为空，data为空，只有children是有值的。因此我们只需要比较children的变化，如果children发生变化了，则替换内容即可。其实现方式如下：

```javascript
function patchText(oldVNode,newVNode,container){
    if(newVNode.children !== oldVNode.children){
        // 注意这里newVNode.el实际上是不存在的，由于节点相同，因此可以直接使用原来的节点
        oldVNode.el.nodeValue = newVNode.children;
    }
}
```

最关键的是patchElement方法的实现。

#### 4.2.4 HTML类型的虚拟DOM的比较

**patchElement方法的实现**<br>

HTML类型的标签生成的虚拟DOM是如下形式：

```javascript
{
  "tag": "div",
  "vNodeType": "HTML",
  "data": {
    "id": "test"
  },
  "children": [
    {
      "tag": "div",
      "vNodeType": "HTML",
      "data": {
        "key": "a"
      },
      "children": "节点2",
      "childType": "SINGLE"
    }
  ],
  "childType": "MULTIPLE"
}
```

我们可以看到HTML类型的虚拟DOM，他的tag，data和children都是有值的，也就是说我们需要分别对其进行比较。其中规则如下：

1. 元素不同，直接替换
2. 元素相同，更新data和children

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\6-patchElement的实现逻辑.jpg)

其大致实现如下所示：

```javascript
function patchElement(oldVNode, newVNode, container) {
  const { tag: oldVNodeTag, data: oldData, el } = oldVNode;
  const { tag: newVNodeTag, data: newData } = newVNode;
  // 如果标签不同，直接天魂
  if (oldVNodeTag !== newVNodeTag) {
    replaceVNode(oldVNode, newVNode, container);
  } else {
    // 如果元素相同，则处理data
    processData(oldData, newData, el);
    // 如果元素相同，则处理children
    patchChildren();   // 待实现
  }
}
```

其中`processData`是用来处理data属性。代码如下：

```javascript
function processData(oldData, newData, el) {
  // 更新
  if (newData) {
    for (let key in newData) {
      let oldValue = oldData[key];
      let newValue = newData[key];
      patchData(el, key, oldValue, newValue);
    }
  }
  // 删除一些不存在的属性
  if (oldData) {
    for (let key in oldData) {
      let oldValue = oldData[key];
      if (oldValue && !newData.hasOwnProperty(key)) {
        el && patchData(el, key, oldValue, null);
      }
    }
  }
}
```

因此，到目前为止其实我们只剩下一个children没有进行比较。而children的比较也是DOM-Diff的核心。对DOM-Diff的优化都集中在这里。因此我们单独做一节进行讲解。

#### 4.2.5 实现patchChildren方法

我们都知道childType存在EMPTY，SINGLE，MULTIPLE三种类型，分别对应于没有子节点，子节点为文本和子节点有多个。因此对于不同情况进行对比，需要进行不同的处理。

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\7-patchChildren.jpg)

对应的代码实现大致框架应该如下所示：

```javascript
function patchChildren(
  oldChildren,
  oldChildType,
  newChildren,
  newChildType,
  container
) {
  console.log(
    "patchChildren:",
    oldChildren,
    oldChildType,
    newChildren,
    newChildType,
    container
  );
  switch (oldChildType) {
    case childTypes.EMPTY:
      switch (newChildType) {
        case childTypes.EMPTY:
          break;
        case childTypes.SINGLE:
            mountText(newChildren,container)
          break;
        case childTypes.MULTIPLE:
            for(let i = 0;i < newChildren.length;i++){
                mount(newChildren[i],container);
            }
          break;
      }

      break;
    case childTypes.SINGLE:
      switch (newChildType) {
        case childTypes.EMPTY:
            container.removeChild(oldChildren.el);
          break;
        case childTypes.SINGLE:
            patchText(oldChildren,newChildren,container)
          break;
        case childTypes.MULTIPLE:
            container.removeChild(oldChildren.el);
            for (let i = 0; i < newChildren.length; i++) {
                mount(newChildren[i], container);
            }
          break;
      }
      break;
    case childTypes.MULTIPLE:
      switch (newChildType) {
        case childTypes.EMPTY:
            for (let i = 0; i < oldChildren.length; i++) {
                container.removeChild(oldChildren[i].el);
            }
          break;
        case childTypes.SINGLE:
            for (let i = 0; i < oldChildren.length; i++) {
                container.removeChild(oldChildren[i].el);
            }
            mountText(newChildren, container)
          break;
        case childTypes.MULTIPLE:
          // TODO:最核心的逻辑在这里
          updateChiidren(oldChildren,newChildren,container)
          break;
      }
      break;
    default:
      break;
  }
}
```

照着思维导图，我们实现了除了新旧节点都有多个子元素的情况。**其主要思路就是：如果有就更新或者替换，如果没有就删除。**但是对于最后一种情况，不仅仅涉及到添加、删除，还涉及到位置的移动，因此逻辑较为复杂。也是DOM-Diff的各种优化的地方。<br>

**1、给每个虚拟DOM添加唯一的标识key**

事实上最后一种情况就是两个数组的比较，我们需要找到数组中每个元素的变化。示例：

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\8-多个children的比较.jpg)

我们使用createElement创建的虚拟DOM中children的个数为3个，新的虚拟DOM也有3个虚拟DOM。也就是说我们需要比较长度为3的两个数组。我们在之前的DOM-Diff规则中说过，我们的虚拟DOM的比较必须是描述同一个DOM节点之间进行比较。因此我们要找出数组中前后描述同一个节点的两个元素进行比较但是由于虚拟DOM是通过createElement创建的，得到的虚拟DOM也都是由tag，data，children组成，因此我们很难区分哪个虚拟DOM是描述哪一个节点。因此也就无从比较。只能全都删除原来的旧的节点，然后根据新的虚拟DOM创建新的节点。这毫无疑问是非常低效的。**因此，我们第一件事就是需要加上一个标识用来标记这个虚拟DOM是描述哪个节点，这样的话通过这个标识就能够在更改前后进行区分了。**这也是为什么Vue和React在遍历时要求添加唯一的标识的原因。

![](C:\Users\yinhaiying\Desktop\虚拟DOM\achievement\images\9-给每个虚拟DOM添加唯一的标识Key.jpg)



**2、不考虑位置移动，只考虑节点的更新，以及增加和删除**

```javascript
function updateChildren(oldChildren,newChildren,container){
    console.log("updateChildren", oldChildren,newChildren);
    for(let i = 0;i < newChildren.length;i++){
      let newVNode = newChildren[i];
      let isFind = false;
      for(let j = 0;j < oldChildren.length;j++){
        let oldVNode = oldChildren[j];
        if(newVNode.data.key === oldVNode.data.key){
          // key值相等才进行比较
          patch(oldVNode,newVNode,container);
          isFind = true;  // 表示前后都存在这个元素，说明不是新增的元素
        }
      }
      // 没有找到说明是新增的元素，因此需要插入到指定位置
      if(!isFind){
          let flagNode = i === 0 ? oldChildren.el : newChildren[i - 1].el.nextSibling;
          // 表示是需要新增的元素
          mount(nextVNode, container, flagNode)
      }
    }
    // 删除不需要的元素
    for (let i = 0; i < oldChildren.length; i++) {
      console.log("删除不需要的元素:")
      const preVNode = oldChildren[i];
      const has = newChildren.find(next => next.data.key === preVNode.data.key);
      if (!has) {
        container.removeChild(preVNode.el);
      }
    }
}
```

如果我们不考虑节点位置的移动，只是考虑节点的更新包括新增，删除和属性等的更新。那么实现思路比较简单，只需要通过遍历前后节点，对key值相等的进行比较。遍历存在以下几种情况：

- key值在新旧节点中都存在，说明只需要进行diff更新即可。
- key值在新节点中存在，在旧节点中不存在。说明是新增的，注意新增的节点需要插入到指定位置。
- key值在旧节点中存在，在新节点中不存在，说明需要删除这个节点。

这里特别需要注意的是对于新增的元素，不一定是直接在挂载容器的尾部插入，他可能是在指定位置进行插入，因此需要使用`insertBefore`，也就是说我们需要找到参考的节点，在这个参考节点后面插入，因此我们在`mount`方法中新增了一个`flagNode`参数（注意：mount中新增了flagNode参数，同时mountElement也进行了修改）。

**3、考虑节点的位置移动**<br>

我们都知道虚拟DOM是用来描述真实DOM的，因此虚拟DOM位置的改变(也就是在数组中位置的改变)，直接影响到在DOM树上的位置，从而影响整个页面，因此我们不能简单地只更新属性，children等，还需要考虑位置的改变。这也是虚拟DOM优化的一个重点，各种各样的算法优化核心基本上都在这里。但是，这里我们只是为了简单地了解虚拟DOM的Diff过程，不会去写很高深的算法，那样的话反而容易把人陷入算法中，与本文的主旨不符，因此我们这里的算法可能是比较低效的，但是是为了方便理解的。**我们都知道考虑节点的位置移动，最核心的一点就是知道节点发生移动的判断标准是什么？**。**这里我们判断的标准就是两个相邻的元素的顺序是否发生了变化。如果原来是递增的，现在还是递增的，那么就不需要发生移动，如果原来是递增的，现在变成递减了，那么就需要发生移动。**<br>

比如：[“节点1”，“节点4”，“节点2”]中节点1和节点4原来的顺序是0,1递增的。<br>

但是新的vNode变成了[“节点4”，“节点1”，“节点2”]，节点1和节点4的顺序是1,0递减的，说明节点1需要移动位置。他需要插入到节点4的后面。也就是说我们需要一个变量来记录一下前一个元素在旧节点中的位置，然后遍历时又能够获取到它在旧节点中的位置。这样的话，在新节点中他们是递增的(遍历时从1到n，是递增的)，但是如果记录的旧节点是递减的，说明位置发生了移动需要进行位置变化。位置变化的实现就是插入到新的位置。最终的实现如下：

```javascript
function updateChildren(oldChildren,newChildren,container){
    let lastIndex = 0;  // 上一个元素在就数组中的位置
    for(let i = 0;i < newChildren.length;i++){
      let newVNode = newChildren[i];
      let isFind = false;
      for(let j = 0;j < oldChildren.length;j++){
        let oldVNode = oldChildren[j];
        if(newVNode.data.key === oldVNode.data.key){
          patch(oldVNode,newVNode,container);
          isFind = true;  // 表示前后都存在这个元素，说明不是新增的元素
          // 当前元素在旧节点中是在它前面的，现在在它后面了。说明相对位置发生了变化
          if (j < lastIndex) {
            let flagNode = newChildren[i - 1].el.nextSibling;   // 找到要插入位置的下一个元素
            container.insertBefore(preVNode.el, flagNode);
          } else {
            // 记录在旧节点中的位置
            lastIndex = j;
          }
        }
      }
      // 没有找到说明是新增的元素，因此需要插入到指定位置
      if(!isFind){
          let flagNode = i === 0 ? oldChildren.el : newChildren[i - 1].el.nextSibling;
          // 表示是需要新增的元素
          mount(nextVNode, container, flagNode)
      }
    }
    // 删除不需要的元素
    for (let i = 0; i < oldChildren.length; i++) {
      console.log("删除不需要的元素:")
      const preVNode = oldChildren[i];
      const has = newChildren.find(next => next.data.key === preVNode.data.key);
      if (!has) {
        container.removeChild(preVNode.el);
      }
    }
}
```

好了，到目前为止我们就完整地实现了`patchChildren`方法，通过添加key标识，考虑没有移动位置，考虑移动位置，一步一步地实现了DOM-Diff的核心功能。虽然我们实现的方法可能不是高效的，但是是尽可能地能够让大家理解的。

## 五、虚拟DOM的使用优化

### 5.1 虚拟DOM的缺点——必须依赖于createElement

到目前为止，我们已经能够实现虚拟DOM的创建，虚拟DOM的渲染以及虚拟DOM的Diff，也就说我们已经能够完整地使用虚拟DOM在项目中进行开发了。但是我们有没有发现，如果我要使用虚拟DOM，我们必须去写createElement函数。比如，下面的DOM结构：

```html
    <div id="test">
        <p class = "item">p1</p>
        <span id = "span1">span1</span>
    </div>
```

如果我们使用虚拟DOM来写，那么应该是这样的:

```javascript
const vNode = createElement("div",{id:"test"},[
    createElement("p",{key:"a",class:"item"},"p1"),
    createElement("span",{key:"d",{id:"span1"}},"span1"),
]);
```

这还只是简单的两层结构，如果DOM树比较深，那么需要不断地嵌套下去。这样的话写起来就麻烦了。没有人会去写这种代码的。难道我们就因为这个就放弃使用虚拟DOM了吗？肯定不是，事实上React和vue都提供了使用虚拟DOM的优化。其中React就使用了JSX语法来优化虚拟DOM的使用。对于上面的一个虚拟DOM，我们使用JSX写法就是得到这样：

```javascript
createElement("div",{id:"test"},[
    createElement("p",{key:"a",class:"item"},"p1"),
    createElement("span",{key:"d",{id:"span1"}},"span1"),
]);
// jsx写法
<div id = "test">
    <p className = "item">p1</p>
    <span id = "span1"><span/>
</div> 
```

我们可以发现，我们的createElement被写成了<></>，tag作为标签元素放入尖括号中，而data中的属性则作为元素属性通过a=xxx的形式写入，children作为子元素写入，当然React还单独做了一些特殊处理，比如class变成className，以及需要使用react语法时要使用{}。最终我们可以发现，我们写虚拟DOM实际上就像在写真实DOM一样。这样的话既可以利用虚拟DOM的优点又可以摆脱虚拟DOM有赖于createElement函数的缺点，一举两得。同理，在Vue中我们通过template中写入的标签，实际上也是在写虚拟DOM，背后都是Vue在帮助我们简化处理。

## 六、总结

好了，到目前为止我们已经完成了以下内容：

1. 什么是虚拟DOM？
2. 为什么虚拟需要DOM？虚拟DOM优点？
3. 如何创建虚拟DOM？
4. 如何渲染虚拟DOM？
5. 虚拟DOM的Diff实现
6. 虚拟DOM的使用优化

通过一步一步由浅及深地从介绍到实现，从为什么这么做，到如何做，一步一步地完成了虚拟DOM的理解和实现，通过本文你基本上就能够掌握虚拟DOM的大部分知识，更加深入地比如DOM-diff的优化，带着本文掌握的知识，你再去看Vue和React中虚拟DOM的实现，就会轻松许多。好了，还是那句话，想要掌握一个东西，最好的办法就是去简单地实现它。<br>

写在最后，本文中的一下代码，可能在编写过程中存在删减，修改。因此如果想要完整的代码，可以从[github](https://github.com/yinhaiying/vNode/tree/master/achievement)仓库中进行获取。欢迎大家star，我会陆陆续续地通过一些简单的方法去写一些常见的原理或者知识点，帮助大家更好地掌握。<br>

完结撒花。

