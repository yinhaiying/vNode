// 创建虚拟DOM函数
const vNodeTypes = {
  HTML: "HTML",
  TEXT: "TEXT",
  COMPONENT: "COMPONENT",
  CLASS_COMPONENT: "CLASS_COMPONENT",
};
const childTypes = {
  EMPTY: "EMPTY",
  SINGLE: "SINGLE",
  MULTIPLE: "MULTIPLE",
};

function createElement(tag, data, children) {
  let vNodeType;
  if (typeof tag === "string") {
    //元素是一个普通的html标签
    vNodeType = vNodeTypes.HTML;
  } else if (typeof tag === "function") {
    vNodeType = vNodeTypes.COMPONENT;
  } else {
    vNodeType = vNodeTypes.TEXT;
  }
  let childType;
  if (children === null) {
    childType = childTypes.EMPTY;
  } else if (Array.isArray(children)) {
    if (children.length === 0) {
      childType = childTypes.EMPTY;
    } else if (children.length >= 1) {
      childType = childTypes.MULTIPLE;
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
    childType,
  };
}

function createTextVNode(text) {
  return {
    vNodeType: vNodeTypes.TEXT,
    tag: null,
    data: null,
    children: text,
    childType: childTypes.EMPTY,
  };
}

function render(vNode, container) {
  if (container.vNode) {
    // 说明不是首次渲染
    patch(container.vNode, vNode, container);
  } else {
    mount(vNode, container);
  }
  // 每次渲染完成之后都把vNode挂载到container身上
  container.vNode = vNode;
}
function mount(vNode, container) {
  const { vNodeType } = vNode;
  // 不同的节点，有不同的挂载方式。文本节点单独处理
  if (vNodeType == vNodeTypes.HTML) {
    mountElement(vNode, container);
  } else if (vNodeType === vNodeTypes.TEXT) {
    mountText(vNode, container);
  }
}

function mountElement(vNode, container) {
  const { tag, childType, children, data } = vNode;
  const dom = document.createElement(tag);
  vNode.el = dom;

  // 处理data
  if (data) {
    for (let key in data) {
      // 节点，名字，老值，新值.
      patchData(dom, key, null, data[key]);
    }
  }

  if (childType === childTypes.SINGLE) {
    mount(vNode.children, dom);
  } else if (childType === childTypes.MULTIPLE) {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      mount(child, dom);
    }
  }
  container.appendChild(dom);
}

function mountText(vNode, container) {
  const text = vNode.children ? vNode.children:vNode;
  let dom = document.createTextNode(text);
  vNode.el = dom;
  container.appendChild(dom);
}

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
function patch(oldVNode, newVNode, container) {
  const oldVNodeType = oldVNode.vNodeType;
  const newVNodeType = newVNode.vNodeType;
  if (oldVNodeType !== newVNodeType) {
    replaceVNode(oldVNode, newVNode, container);
  } else {
    // 标签相同情况下的处理
    if (newVNodeType === vNodeTypes.HTML) {
      // 标签为HTML的情况下的处理
      patchElement(oldVNode, newVNode, container);
    } else if (newVNodeType === vNodeTypes.TEXT) {
      // 标签为TEXT的情况下的处理
      patchText(oldVNode, newVNode, container);
    }
  }
}

function replaceVNode(oldVNode, newVNode, container) {
  container.removeChild(oldVNode.el);
  mount(newVNode, container);
}

function patchElement(oldVNode, newVNode, container) {
  const {
    tag: oldVNodeTag,
    data: oldData,
    children: oldChildren,
    childType: oldChildType,
    el,
  } = oldVNode;
  const {
    tag: newVNodeTag,
    data: newData,
    children: newChildren,
    childType: newChildType,
  } = newVNode;
  // 如果标签不同，直接天魂
  if (oldVNodeTag !== newVNodeTag) {
    replaceVNode(oldVNode, newVNode, container);
  } else {
    // 如果元素相同，则处理data
    processData(oldData, newData, el);
    // 如果元素相同，则处理children
    patchChildren(
      oldChildren,
      oldChildType,
      newChildren,
      newChildType,
      el
    );
  }
}

// patchChildren 对比children

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
          break;
      }
      break;
    default:
      break;
  }
}

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

function patchText(oldVNode, newVNode, container) {
  if (newVNode.children !== oldVNode.children) {
    oldVNode.el.nodeValue = newVNode.children;
  }
}
