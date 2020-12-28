const vNodeType = {
    HTML:"HTML",
    TEXT:"TEXT",
    COMPONENT:"COMPONENT",
    CLASS_COMPONENT:"CLASS_COMPONENT"
}
const childrenType = {
    EMPTY:"EMPTY",
    SINGLE:"SINGLE",
    MULTIPLE:"MULTIPLE"
}


// 新建虚拟DOM  createElement

// 标签名，属性，子元素
function createElement(tag,data,children=null){
    let flag;   // 用于标记元素的类型
    if(typeof tag === "string"){
        //元素是一个普通的html标签
        flag = vNodeType.HTML;
    }else if(typeof tag === "function"){
        flag = vNodeType.COMPONENT
    }else{
        flag = vNodeType.TEXT
    }
    let childrenFlag;  // 用于标记子元素的类型，没有子元素，一个子元素和多个子元素
    if(children==null){
      childrenFlag = childrenType.EMPTY;
    }else if(Array.isArray(children)){
        let len = children.length;
        if(len === 0){
            childrenFlag = childrenType.EMPTY;
        }else if(len >=1){
            childrenFlag = childrenType.MULTIPLE;
        }
    }else{
        //其他情况认为是文本
        childrenFlag = childrenType.SINGLE;
        children = createTextVNode(children+"")
    }
    
    // 返回vNode
  return {
    tag,    // 如果是文本，没有tag，如果是组件，就是一个函数
    flag,     // vnode类型
    data,
    children,
    childrenFlag,
    el:null
  }
}


// 创建文本类型的虚拟DOM
function createTextVNode(text){
  return {
      flag:vNodeType.TEXT,
      tag:null,
      data:null,
      children:text,
      childrenFlag: childrenType.EMPTY
  }
}

// 如何渲染 render

function render(vNode, container) {
    // 区分首次渲染和再次渲染,再次渲染需要进行diff。
    console.log("vNode",JSON.stringify(vNode, null, 2))
    mount(vNode,container)
}

// mount
function mount(vNode,container){
  let {flag} = vNode;
  if(flag == vNodeType.HTML){
      mountElement(vNode,container);
  }else if(flag = vNodeType.TEXT){
      mountText(vNode, container);
  }
}

//挂载元素
function mountElement(vNode, container) {
  let dom = document.createElement(vNode.tag);
  vNode.el = dom;
  let {data,children,childrenFlag} = vNode;
  // 挂载data
  if(data){
      for(let key in data){
          // 节点，名字，老值，新值.
          patchData(dom,key,null,data[key])
      }
  }
  // 挂载子元素
  if(childrenFlag !== childrenType.EMPTY){
      if (childrenFlag === childrenType.SINGLE){
        mount(children,dom)
      } else if (childrenFlag === childrenType.MULTIPLE) {
          for(let i = 0;i < children.length;i++){
              mount(children[i],dom);
          }
      }
  }
  container.appendChild(dom);
}

// 挂载文本
function mountText(vNode,container){
  let dom = document.createTextNode(vNode.children);
  vNode.el =dom;
  container.appendChild(dom);
}


// 挂载data
function patchData(el, key, prev, next) {
  switch(key){
      case "style":
          for(let k in next){
              el.style[k] = next[k];
          }
          break;
      case "class":
          el.className = next;
          break;
      default:
          if(key[0] === "@"){
              el.addEventListener(key.slice(1),next);
          }else{
              el.setAttribute(key,next);
          }
          break;
  }
}