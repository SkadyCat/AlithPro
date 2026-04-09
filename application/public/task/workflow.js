(function () {
  function cloneWorkflow(workflow) {
    return {
      ...workflow,
      source: { ...(workflow.source || {}) },
      nodes: Array.isArray(workflow.nodes) ? workflow.nodes.map((node) => ({ ...node })) : [],
    };
  }

  function createNodeElement(node) {
    const element = document.createElement("div");
    element.className = `workflow-node workflow-node-${node.type || "document"}`;
    element.dataset.nodeId = node.id;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.width = `${node.width}px`;
    element.style.height = `${node.height}px`;
    const showInputPort = node.type !== "start";
    const showOutputPort = node.type !== "end";
    element.innerHTML = `
      ${showInputPort ? '<span class="workflow-node-port workflow-node-port-in"></span>' : ""}
      ${showOutputPort ? '<span class="workflow-node-port workflow-node-port-out"></span>' : ""}
      <div class="workflow-node-meta">${node.type === "document" ? (node.bucket || "workflow") : "workflow"}</div>
      <div class="workflow-node-title">${node.title}</div>
      <div class="workflow-node-path">${node.fileName || (node.type === "start" ? "任务流开始节点" : node.type === "end" ? "任务流结束节点" : "工作流文档节点")}</div>
    `;
    return element;
  }

  function createWorkflowManager(options) {
    const {
      modal,
      titleEl,
      metaEl,
      canvasEl,
      nodesEl,
      emptyEl,
      closeButton,
      saveButton,
      newNodeButton,
      placeNodeButton,
      onSave,
      onError,
      onToast,
    } = options;

    if (!modal || !canvasEl || !nodesEl) {
      return {
        open() {},
        close() {},
        isOpen() { return false; },
        setAvailableDocuments() {},
      };
    }

    const state = {
      workflow: null,
      availableDocuments: [],
      menuPoint: { x: 120, y: 120 },
      drag: null,
    };

    const menu = document.createElement("div");
    menu.className = "workflow-floating-menu";
    menu.hidden = true;
    menu.innerHTML = `
      <button type="button" class="workflow-floating-button" data-action="new">新建工作流节点</button>
      <button type="button" class="workflow-floating-button" data-action="place">放置工作流节点</button>
    `;
    canvasEl.appendChild(menu);

    const picker = document.createElement("div");
    picker.className = "workflow-picker";
    picker.hidden = true;
    picker.innerHTML = `
      <div class="workflow-picker-header">
        <span class="workflow-picker-title">放置工作流节点</span>
        <button type="button" class="btn-secondary" data-role="close-picker">关闭</button>
      </div>
      <input type="text" class="workflow-picker-search" data-role="search" placeholder="搜索文档名..." />
      <div class="workflow-picker-list" data-role="list"></div>
    `;
    canvasEl.appendChild(picker);

    const pickerSearch = picker.querySelector('[data-role="search"]');
    const pickerList = picker.querySelector('[data-role="list"]');
    const pickerClose = picker.querySelector('[data-role="close-picker"]');

    function updateHeader() {
      if (!state.workflow) {
        titleEl.textContent = "任务流节点画布";
        metaEl.textContent = "";
        return;
      }
      titleEl.textContent = state.workflow.title || state.workflow.fileName || "任务流节点画布";
      metaEl.textContent = `${state.workflow.fileName} · ${state.workflow.nodes.length} 个节点`;
    }

    function hideMenu() {
      menu.hidden = true;
    }

    function hidePicker() {
      picker.hidden = true;
      pickerSearch.value = "";
    }

    function renderPickerList() {
      const query = String(pickerSearch.value || "").trim().toLowerCase();
      const items = state.availableDocuments.filter((item) => {
        if (!query) {
          return true;
        }
        return `${item.title} ${item.fileName} ${item.bucket}`.toLowerCase().includes(query);
      });

      if (!items.length) {
        pickerList.innerHTML = `<div class="workflow-picker-empty">暂无可放置的 workflow 文档。</div>`;
        return;
      }

      pickerList.innerHTML = "";
      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "workflow-picker-item";
        button.innerHTML = `
          <span class="workflow-picker-bucket">${item.bucket}</span>
          <span class="workflow-picker-name">${item.title}</span>
        `;
        button.addEventListener("click", () => {
          addNode({
            title: item.title,
            bucket: item.bucket,
            fileName: item.fileName,
            type: "document",
          }, state.menuPoint);
          hidePicker();
        });
        pickerList.appendChild(button);
      });
    }

    function openPicker(point = state.menuPoint) {
      state.menuPoint = point;
      renderPickerList();
      picker.hidden = false;
      pickerSearch.focus();
    }

    function showMenu(point) {
      state.menuPoint = point;
      menu.hidden = false;
      menu.style.left = `${point.x}px`;
      menu.style.top = `${point.y}px`;
    }

    function addNode(nodeInput, point = state.menuPoint) {
      if (!state.workflow) {
        return;
      }
      state.workflow.nodes.push({
        id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(nodeInput.title || "未命名文档节点").trim() || "未命名文档节点",
        type: String(nodeInput.type || "document").trim() || "document",
        bucket: String(nodeInput.bucket || "workflow").trim() || "workflow",
        fileName: String(nodeInput.fileName || "").trim(),
        x: point.x,
        y: point.y,
        width: 360,
        height: 180,
      });
      render();
    }

    function render() {
      updateHeader();
      nodesEl.innerHTML = "";
      const nodes = state.workflow?.nodes || [];
      emptyEl.hidden = nodes.length > 0;
      nodes.forEach((node) => nodesEl.appendChild(createNodeElement(node)));
    }

    async function saveWorkflow() {
      if (!state.workflow || typeof onSave !== "function") {
        return;
      }
      try {
        const result = await onSave(cloneWorkflow(state.workflow));
        if (result) {
          state.workflow = cloneWorkflow(result);
        }
        render();
        onToast?.(`💾 已保存任务流 ${state.workflow.fileName}`);
      } catch (error) {
        onError?.(error.message || "保存任务流失败。");
      }
    }

    function open(workflow, availableDocuments = []) {
      state.workflow = cloneWorkflow(workflow);
      state.availableDocuments = Array.isArray(availableDocuments) ? availableDocuments.slice() : [];
      modal.hidden = false;
      modal.classList.remove("hidden");
      hideMenu();
      hidePicker();
      render();
    }

    function close() {
      state.workflow = null;
      modal.hidden = true;
      modal.classList.add("hidden");
      hideMenu();
      hidePicker();
    }

    function isOpen() {
      return !modal.hidden;
    }

    function setAvailableDocuments(documents) {
      state.availableDocuments = Array.isArray(documents) ? documents.slice() : [];
      if (!picker.hidden) {
        renderPickerList();
      }
    }

    menu.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      hideMenu();
      if (action === "new") {
        const title = window.prompt("输入工作流节点对应的文档名称：", "未命名文档节点");
        if (title === null) {
          return;
        }
        addNode({ title, type: "document", bucket: "workflow", fileName: "" }, state.menuPoint);
      } else if (action === "place") {
        openPicker();
      }
    });

    pickerSearch.addEventListener("input", renderPickerList);
    pickerClose.addEventListener("click", hidePicker);

    canvasEl.addEventListener("contextmenu", (event) => {
      if (!state.workflow) {
        return;
      }
      event.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      showMenu({
        x: event.clientX - rect.left + canvasEl.scrollLeft,
        y: event.clientY - rect.top + canvasEl.scrollTop,
      });
    });

    canvasEl.addEventListener("mousedown", (event) => {
      const nodeEl = event.target.closest(".workflow-node");
      if (!nodeEl || !state.workflow) {
        return;
      }
      const node = state.workflow.nodes.find((item) => item.id === nodeEl.dataset.nodeId);
      if (!node) {
        return;
      }
      const rect = canvasEl.getBoundingClientRect();
      state.drag = {
        node,
        offsetX: event.clientX - rect.left + canvasEl.scrollLeft - node.x,
        offsetY: event.clientY - rect.top + canvasEl.scrollTop - node.y,
      };
    });

    window.addEventListener("mousemove", (event) => {
      if (!state.drag || !state.workflow) {
        return;
      }
      const rect = canvasEl.getBoundingClientRect();
      state.drag.node.x = Math.max(16, event.clientX - rect.left + canvasEl.scrollLeft - state.drag.offsetX);
      state.drag.node.y = Math.max(16, event.clientY - rect.top + canvasEl.scrollTop - state.drag.offsetY);
      render();
    });

    window.addEventListener("mouseup", () => {
      state.drag = null;
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        close();
      }
    });

    closeButton?.addEventListener("click", close);
    saveButton?.addEventListener("click", saveWorkflow);
    newNodeButton?.addEventListener("click", () => {
      state.menuPoint = {
        x: canvasEl.scrollLeft + 120,
        y: canvasEl.scrollTop + 120,
      };
      const title = window.prompt("输入工作流节点对应的文档名称：", "未命名文档节点");
      if (title === null) {
        return;
      }
      addNode({ title, type: "document", bucket: "workflow", fileName: "" }, state.menuPoint);
    });
    placeNodeButton?.addEventListener("click", () => {
      state.menuPoint = {
        x: canvasEl.scrollLeft + 160,
        y: canvasEl.scrollTop + 160,
      };
      openPicker(state.menuPoint);
    });

    return {
      open,
      close,
      isOpen,
      setAvailableDocuments,
    };
  }

  window.AlithTaskWorkflow = {
    createWorkflowManager,
  };
})();
